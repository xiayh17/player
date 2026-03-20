use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshProfile {
    pub id: String,
    pub host: String,
    pub hostname: String,
    pub port: u16,
    pub user: Option<String>,
    pub identity_file: Option<String>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshConnectionRequest {
    pub profile_id: Option<String>,
    pub host: Option<String>,
    pub hostname: Option<String>,
    pub port: Option<u16>,
    pub user: Option<String>,
    pub remote_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshConnectionResult {
    pub ok: bool,
    pub status: String,
    pub message: String,
    pub checked_at: String,
    pub host: String,
    pub port: u16,
    pub user: Option<String>,
}

fn now_iso_string() -> String {
    Command::new("date")
        .arg("-u")
        .arg("+%Y-%m-%dT%H:%M:%SZ")
        .output()
        .ok()
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "1970-01-01T00:00:00Z".to_string())
}

fn ssh_config_path() -> Option<PathBuf> {
    let home = env::var("HOME").ok()?;
    let path = PathBuf::from(home).join(".ssh").join("config");
    path.exists().then_some(path)
}

fn parse_ssh_profiles(content: &str) -> Vec<SshProfile> {
    let mut profiles = Vec::new();
    let mut current_hosts: Vec<String> = Vec::new();
    let mut hostname: Option<String> = None;
    let mut port: Option<u16> = None;
    let mut user: Option<String> = None;
    let mut identity_file: Option<String> = None;

    let flush_current = |profiles: &mut Vec<SshProfile>,
                         current_hosts: &mut Vec<String>,
                         hostname: &mut Option<String>,
                         port: &mut Option<u16>,
                         user: &mut Option<String>,
                         identity_file: &mut Option<String>| {
        if current_hosts.is_empty() {
            return;
        }

        let resolved_hostname = hostname.clone().unwrap_or_else(|| current_hosts[0].clone());
        let resolved_port = port.unwrap_or(22);
        let resolved_user = user.clone();
        let resolved_identity = identity_file.clone();

        for host in current_hosts.iter() {
            if host.contains('*') || host.contains('?') {
                continue;
            }

            profiles.push(SshProfile {
                id: host.clone(),
                host: host.clone(),
                hostname: resolved_hostname.clone(),
                port: resolved_port,
                user: resolved_user.clone(),
                identity_file: resolved_identity.clone(),
                source: "ssh_config".to_string(),
            });
        }

        current_hosts.clear();
        *hostname = None;
        *port = None;
        *user = None;
        *identity_file = None;
    };

    for raw_line in content.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        let mut parts = line.split_whitespace();
        let key = match parts.next() {
            Some(value) => value.to_lowercase(),
            None => continue,
        };
        let value = parts.collect::<Vec<_>>().join(" ");
        if value.is_empty() {
            continue;
        }

        match key.as_str() {
            "host" => {
                flush_current(
                    &mut profiles,
                    &mut current_hosts,
                    &mut hostname,
                    &mut port,
                    &mut user,
                    &mut identity_file,
                );
                current_hosts = value
                    .split_whitespace()
                    .map(|item| item.trim().to_string())
                    .filter(|item| !item.is_empty())
                    .collect();
            }
            "hostname" => hostname = Some(value),
            "port" => port = value.parse::<u16>().ok(),
            "user" => user = Some(value),
            "identityfile" => identity_file = Some(value),
            _ => {}
        }
    }

    flush_current(
        &mut profiles,
        &mut current_hosts,
        &mut hostname,
        &mut port,
        &mut user,
        &mut identity_file,
    );

    profiles.sort_by(|left, right| left.id.cmp(&right.id));
    profiles.dedup_by(|left, right| left.id == right.id);
    profiles
}

fn load_ssh_profiles() -> Vec<SshProfile> {
    ssh_config_path()
        .and_then(|path| fs::read_to_string(path).ok())
        .map(|content| parse_ssh_profiles(&content))
        .unwrap_or_default()
}

fn resolve_request_target(request: &SshConnectionRequest, profiles: &[SshProfile]) -> Result<(String, u16, Option<String>, Vec<String>), String> {
    let matched_profile = request
        .profile_id
        .as_ref()
        .and_then(|profile_id| profiles.iter().find(|profile| &profile.id == profile_id));

    let host = request
        .hostname
        .clone()
        .or_else(|| request.host.clone())
        .or_else(|| matched_profile.map(|profile| profile.hostname.clone()))
        .or_else(|| matched_profile.map(|profile| profile.host.clone()))
        .ok_or_else(|| "SSH host is not configured".to_string())?;

    let port = request
        .port
        .or_else(|| matched_profile.map(|profile| profile.port))
        .unwrap_or(22);

    let user = request
        .user
        .clone()
        .or_else(|| matched_profile.and_then(|profile| profile.user.clone()));

    let mut args = vec![
        "-o".to_string(),
        "BatchMode=yes".to_string(),
        "-o".to_string(),
        "StrictHostKeyChecking=no".to_string(),
        "-o".to_string(),
        "ConnectTimeout=5".to_string(),
        "-p".to_string(),
        port.to_string(),
    ];

    if let Some(profile_id) = request.profile_id.as_ref() {
        if matched_profile.is_some() {
            args.push(profile_id.clone());
        } else {
            let target = match user.as_ref() {
                Some(user) if !user.is_empty() => format!("{}@{}", user, host),
                _ => host.clone(),
            };
            args.push(target);
        }
    } else {
        let target = match user.as_ref() {
            Some(user) if !user.is_empty() => format!("{}@{}", user, host),
            _ => host.clone(),
        };
        args.push(target);
    }

    args.push("exit".to_string());

    Ok((host, port, user, args))
}

fn classify_ssh_failure(stderr: &str) -> String {
    let normalized = stderr.to_lowercase();

    if normalized.contains("permission denied") {
        return "auth_failed".to_string();
    }
    if normalized.contains("could not resolve hostname") || normalized.contains("name or service not known") {
        return "unknown_host".to_string();
    }
    if normalized.contains("connection timed out")
        || normalized.contains("operation timed out")
        || normalized.contains("no route to host")
        || normalized.contains("connection refused")
    {
        return "host_unreachable".to_string();
    }
    if normalized.contains("bad configuration option")
        || normalized.contains("could not parse")
        || normalized.contains("missing argument")
    {
        return "config_error".to_string();
    }

    "error".to_string()
}

#[tauri::command]
pub async fn list_ssh_profiles() -> Result<Vec<SshProfile>, String> {
    Ok(load_ssh_profiles())
}

#[tauri::command]
pub async fn test_ssh_connection(request: SshConnectionRequest) -> Result<SshConnectionResult, String> {
    let profiles = load_ssh_profiles();
    let (host, port, user, args) = resolve_request_target(&request, &profiles)?;
    let checked_at = now_iso_string();

    let output = Command::new("ssh")
        .args(args)
        .output()
        .map_err(|error| format!("Failed to launch ssh: {}", error))?;

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let ok = output.status.success();
    let status = if ok {
        "connected".to_string()
    } else {
        classify_ssh_failure(&stderr)
    };
    let message = if ok {
        if stdout.is_empty() {
            format!("SSH connection to {} succeeded", host)
        } else {
            stdout
        }
    } else if stderr.is_empty() {
        format!("SSH connection to {} failed", host)
    } else {
        stderr
    };

    Ok(SshConnectionResult {
        ok,
        status,
        message,
        checked_at,
        host,
        port,
        user,
    })
}

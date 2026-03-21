use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const EXAMPLE_WORKSPACE_NAME: &str = "aimd-example-workspace";

// ── Data types ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ProtocolEntry {
    pub id: String,
    pub name: String,
    pub title: Option<String>,
    #[serde(rename = "type")]
    pub kind: ProtocolKind,
    pub path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ProtocolKind {
    File,
    Folder,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceInfo {
    pub path: String,
    pub name: String,
    pub last_opened_at: i64,
    pub last_opened_protocol: Option<String>,
    pub protocols: Vec<ProtocolEntry>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub recent_workspaces: Vec<RecentWorkspace>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecentWorkspace {
    pub path: String,
    pub name: String,
    pub last_opened_at: i64,
    pub last_opened_protocol: Option<String>,
}

// ── State persistence ─────────────────────────────────────────────────────────

fn state_path(app: &tauri::AppHandle) -> PathBuf {
    let dir = app.path().app_data_dir().expect("app data dir");
    fs::create_dir_all(&dir).ok();
    dir.join("state.json")
}

fn load_state(app: &tauri::AppHandle) -> AppState {
    let path = state_path(app);
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_state(app: &tauri::AppHandle, state: &AppState) -> Result<(), String> {
    let path = state_path(app);
    let json = serde_json::to_string_pretty(state).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn now_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

// ── First launch detection ───────────────────────────────────────────────────

fn is_first_launch(app: &tauri::AppHandle) -> bool {
    load_state(app).recent_workspaces.is_empty()
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    if !src.is_dir() {
        return Err(format!("Source is not a directory: {}", src.display()));
    }

    fs::create_dir_all(dst).map_err(|e| format!("Failed to create directory: {}", e))?;

    for entry in fs::read_dir(src).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Failed to copy file: {}", e))?;
        }
    }
    Ok(())
}

// ── Protocol scanning ─────────────────────────────────────────────────────────

/// Stable ID: relative path from workspace root, url-encoded
fn protocol_id(workspace: &Path, protocol_path: &Path) -> String {
    protocol_path
        .strip_prefix(workspace)
        .unwrap_or(protocol_path)
        .to_string_lossy()
        .replace(std::path::MAIN_SEPARATOR, "/")
}

/// Read the first line of an .aimd file and extract a `# Heading` title.
fn extract_aimd_title(path: &Path) -> Option<String> {
    let content = fs::read_to_string(path).ok()?;
    let first_line = content.lines().next()?.trim();
    if first_line.starts_with("# ") {
        let title = first_line[2..].trim();
        if title.is_empty() {
            None
        } else {
            Some(title.to_string())
        }
    } else {
        None
    }
}

fn scan_dir(workspace: &Path, dir: &Path, results: &mut Vec<ProtocolEntry>) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };

        // skip hidden dirs and common noise
        if name.starts_with('.') || name == "node_modules" {
            continue;
        }

        if path.is_dir() {
            // folder protocol: contains protocol.json
            if path.join("protocol.json").exists() {
                let rel_path = protocol_id(workspace, &path);
                results.push(ProtocolEntry {
                    id: rel_path.clone(),
                    name: folder_protocol_name(&path),
                    title: None,
                    kind: ProtocolKind::Folder,
                    path: rel_path,
                });
                // don't recurse into folder protocols
            } else {
                scan_dir(workspace, &path, results);
            }
        } else if path.extension().and_then(|e| e.to_str()) == Some("aimd") {
            let stem = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or(&name)
                .to_string();
            let rel_path = protocol_id(workspace, &path);
            results.push(ProtocolEntry {
                id: rel_path.clone(),
                name: stem,
                title: extract_aimd_title(&path),
                kind: ProtocolKind::File,
                path: rel_path,
            });
        }
    }
}

fn folder_protocol_name(path: &Path) -> String {
    // try reading name from protocol.json, fall back to dir name
    let manifest = path.join("protocol.json");
    if let Ok(content) = fs::read_to_string(&manifest) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(name) = v.get("name").and_then(|n| n.as_str()) {
                return name.to_string();
            }
        }
    }
    path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Untitled")
        .to_string()
}

#[tauri::command]
pub async fn remove_recent_workspace(
    app: tauri::AppHandle,
    path: String,
) -> Result<(), String> {
    let mut state = load_state(&app);
    state.recent_workspaces.retain(|w| w.path != path);
    save_state(&app, &state)
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn open_workspace(
    app: tauri::AppHandle,
    path: String,
) -> Result<WorkspaceInfo, String> {
    let workspace = PathBuf::from(&path);
    if !workspace.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }

    let name = workspace
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Workspace")
        .to_string();

    let mut protocols = Vec::new();
    scan_dir(&workspace, &workspace, &mut protocols);

    let now = now_secs();
    let mut state = load_state(&app);

    // upsert into recent list
    state.recent_workspaces.retain(|w| w.path != path);
    state.recent_workspaces.insert(
        0,
        RecentWorkspace {
            path: path.clone(),
            name: name.clone(),
            last_opened_at: now,
            last_opened_protocol: None,
        },
    );
    state.recent_workspaces.truncate(20);
    save_state(&app, &state)?;

    Ok(WorkspaceInfo {
        path,
        name,
        last_opened_at: now,
        last_opened_protocol: None,
        protocols,
    })
}

#[tauri::command]
pub async fn scan_workspace(path: String) -> Result<Vec<ProtocolEntry>, String> {
    let workspace = PathBuf::from(&path);
    if !workspace.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    let mut protocols = Vec::new();
    scan_dir(&workspace, &workspace, &mut protocols);
    Ok(protocols)
}

#[tauri::command]
pub async fn get_recent_workspaces(app: tauri::AppHandle) -> Result<Vec<RecentWorkspace>, String> {
    Ok(load_state(&app).recent_workspaces)
}

#[tauri::command]
pub async fn set_last_opened_protocol(
    app: tauri::AppHandle,
    workspace_path: String,
    protocol_id: String,
) -> Result<(), String> {
    let mut state = load_state(&app);
    if let Some(w) = state.recent_workspaces.iter_mut().find(|w| w.path == workspace_path) {
        w.last_opened_protocol = Some(protocol_id);
    }
    save_state(&app, &state)
}

#[tauri::command]
pub async fn check_first_launch(app: tauri::AppHandle) -> Result<bool, String> {
    Ok(is_first_launch(&app))
}

#[tauri::command]
pub async fn open_example_workspace(app: tauri::AppHandle) -> Result<WorkspaceInfo, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?;

    let src_example = resource_dir.join("examples").join(EXAMPLE_WORKSPACE_NAME);

    if !src_example.exists() {
        return Err(format!(
            "Example workspace not found in resources: {}",
            src_example.display()
        ));
    }

    let temp_dir = std::env::temp_dir().join(format!(
        "aimdlab-example-{}",
        std::process::id()
    ));

    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to clean temp directory: {}", e))?;
    }

    copy_dir_recursive(&src_example, &temp_dir)?;

    let path = temp_dir.to_string_lossy().to_string();
    open_workspace(app, path).await
}

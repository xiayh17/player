use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum VarCardNamespace {
    Builtin,
    User,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VarCardOption {
    pub label: String,
    pub value: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VarCardSchema {
    pub kind: String,
    pub base_type: Option<String>,
    pub input_kind: Option<String>,
    pub label: Option<String>,
    pub placeholder: Option<String>,
    pub default_value: Option<Value>,
    pub helper_text: Option<String>,
    pub unit: Option<String>,
    pub format: Option<String>,
    pub rows: Option<u32>,
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub step: Option<f64>,
    pub language: Option<String>,
    pub accept: Option<String>,
    pub preview_mode: Option<String>,
    pub service_type: Option<String>,
    pub service_profile_id: Option<String>,
    pub service_host: Option<String>,
    pub service_port: Option<u16>,
    pub service_username: Option<String>,
    pub service_remote_path: Option<String>,
    #[serde(default)]
    pub options: Vec<VarCardOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VarCardLayout {
    pub variant: String,
    pub density: String,
    pub align: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VarCardAppearance {
    pub accent_color: Option<String>,
    pub icon: Option<String>,
    pub badge: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VarCardBehavior {
    pub allow_manual_input: bool,
    pub allow_copy: bool,
    pub live_value: bool,
    pub required: Option<bool>,
    pub validation_hint: Option<String>,
    pub empty_state: Option<String>,
    pub help_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VarCardManifest {
    pub id: String,
    pub namespace: VarCardNamespace,
    pub version: String,
    pub title: String,
    pub description: String,
    pub icon: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub readonly: bool,
    pub base_card_id: Option<String>,
    pub record_type: String,
    pub demo_value: Value,
    pub schema: VarCardSchema,
    pub layout: VarCardLayout,
    pub appearance: VarCardAppearance,
    pub behavior: VarCardBehavior,
}

fn user_cards_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let cards_dir = app_data_dir.join("cards").join("user");
    fs::create_dir_all(&cards_dir).map_err(|e| e.to_string())?;
    Ok(cards_dir)
}

fn validate_card_id(id: &str) -> Result<(), String> {
    if id.is_empty() {
        return Err("Var Card id cannot be empty".to_string());
    }

    if id
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        Ok(())
    } else {
        Err(format!(
            "Invalid Var Card id '{}'. Use only letters, numbers, '-' or '_'",
            id
        ))
    }
}

fn manifest_path(app: &tauri::AppHandle, id: &str) -> Result<PathBuf, String> {
    validate_card_id(id)?;
    Ok(user_cards_dir(app)?.join(id).join("manifest.json"))
}

fn read_manifest(path: &PathBuf) -> Result<VarCardManifest, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str::<VarCardManifest>(&content).map_err(|e| e.to_string())
}

fn write_manifest(app: &tauri::AppHandle, manifest: &VarCardManifest) -> Result<VarCardManifest, String> {
    if manifest.namespace != VarCardNamespace::User {
        return Err("Only user Var Cards can be persisted".to_string());
    }

    validate_card_id(&manifest.id)?;

    let mut normalized = manifest.clone();
    normalized.namespace = VarCardNamespace::User;
    normalized.readonly = false;

    let path = manifest_path(app, &normalized.id)?;
    let parent = path
        .parent()
        .ok_or_else(|| "Invalid Var Card manifest path".to_string())?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;

    let payload = serde_json::to_string_pretty(&normalized).map_err(|e| e.to_string())?;
    fs::write(path, payload).map_err(|e| e.to_string())?;

    Ok(normalized)
}

#[tauri::command]
pub async fn list_var_cards(app: tauri::AppHandle) -> Result<Vec<VarCardManifest>, String> {
    let cards_dir = user_cards_dir(&app)?;
    let mut manifests = Vec::new();

    for entry in fs::read_dir(cards_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let card_dir = entry.path();
        if !card_dir.is_dir() {
            continue;
        }

        let manifest_file = card_dir.join("manifest.json");
        if !manifest_file.exists() {
            continue;
        }

        manifests.push(read_manifest(&manifest_file)?);
    }

    manifests.sort_by(|left, right| {
        left.title
            .to_lowercase()
            .cmp(&right.title.to_lowercase())
            .then_with(|| left.id.cmp(&right.id))
    });

    Ok(manifests)
}

#[tauri::command]
pub async fn get_var_card(app: tauri::AppHandle, id: String) -> Result<VarCardManifest, String> {
    let path = manifest_path(&app, &id)?;
    if !path.exists() {
        return Err(format!("Var Card '{}' does not exist", id));
    }
    read_manifest(&path)
}

#[tauri::command]
pub async fn clone_var_card(
    app: tauri::AppHandle,
    source_manifest: VarCardManifest,
    new_id: String,
) -> Result<VarCardManifest, String> {
    validate_card_id(&new_id)?;

    let cloned = VarCardManifest {
        id: new_id.clone(),
        namespace: VarCardNamespace::User,
        version: source_manifest.version.clone(),
        title: format!("{} Copy", source_manifest.title),
        description: source_manifest.description.clone(),
        icon: source_manifest.icon.clone(),
        tags: source_manifest.tags.clone(),
        readonly: false,
        base_card_id: Some(format!(
            "{}:{}",
            match source_manifest.namespace {
                VarCardNamespace::Builtin => "builtin",
                VarCardNamespace::User => "user",
            },
            source_manifest.id
        )),
        record_type: format!("card:user/{}", new_id),
        demo_value: source_manifest.demo_value.clone(),
        schema: source_manifest.schema.clone(),
        layout: source_manifest.layout.clone(),
        appearance: source_manifest.appearance.clone(),
        behavior: source_manifest.behavior.clone(),
    };

    write_manifest(&app, &cloned)
}

#[tauri::command]
pub async fn save_var_card(
    app: tauri::AppHandle,
    manifest: VarCardManifest,
) -> Result<VarCardManifest, String> {
    write_manifest(&app, &manifest)
}

#[tauri::command]
pub async fn delete_var_card(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let path = manifest_path(&app, &id)?;
    let card_dir = path
        .parent()
        .ok_or_else(|| "Invalid Var Card directory".to_string())?;

    if !card_dir.exists() {
        return Err(format!("Var Card '{}' does not exist", id));
    }

    fs::remove_dir_all(card_dir).map_err(|e| e.to_string())
}

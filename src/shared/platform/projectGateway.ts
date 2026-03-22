import { invoke } from "@tauri-apps/api/core"
import type { Project } from "@/shared/domain/workspace/projectTypes"

export interface ProjectGateway {
  listProjects(): Promise<Project[]>
  createProject(name: string, description?: string, path?: string): Promise<Project>
  openProject(id: string): Promise<Project>
  deleteProject(id: string): Promise<void>
}

export const tauriProjectGateway: ProjectGateway = {
  listProjects() {
    return invoke<Project[]>("list_projects")
  },
  createProject(name, description, path) {
    return invoke<Project>("create_project", {
      name,
      description: description || null,
      path: path || null,
    })
  },
  openProject(id) {
    return invoke<Project>("open_project", { id })
  },
  deleteProject(id) {
    return invoke("delete_project", { id })
  },
}

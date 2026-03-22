import { defineStore } from "pinia"
import { ref } from "vue"
import { tauriProjectGateway } from "@/shared/platform/projectGateway"
import type { Project } from "@/shared/domain/workspace/projectTypes"

export type { Project } from "@/shared/domain/workspace/projectTypes"

export const useProjectStore = defineStore("project", () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchProjects() {
    loading.value = true
    error.value = null
    try {
      projects.value = await tauriProjectGateway.listProjects()
    } catch (e) {
      error.value = String(e)
      console.error("Failed to fetch projects:", e)
    } finally {
      loading.value = false
    }
  }

  async function createProject(
    name: string,
    description?: string,
    path?: string
  ): Promise<Project | null> {
    loading.value = true
    error.value = null
    try {
      const project = await tauriProjectGateway.createProject(name, description, path)
      projects.value.unshift(project)
      return project
    } catch (e) {
      error.value = String(e)
      console.error("Failed to create project:", e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function openProject(id: string): Promise<Project | null> {
    loading.value = true
    error.value = null
    try {
      const project = await tauriProjectGateway.openProject(id)
      currentProject.value = project
      return project
    } catch (e) {
      error.value = String(e)
      console.error("Failed to open project:", e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteProject(id: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      await tauriProjectGateway.deleteProject(id)
      projects.value = projects.value.filter((p) => p.id !== id)
      if (currentProject.value?.id === id) {
        currentProject.value = null
      }
      return true
    } catch (e) {
      error.value = String(e)
      console.error("Failed to delete project:", e)
      return false
    } finally {
      loading.value = false
    }
  }

  function setCurrentProject(project: Project | null) {
    currentProject.value = project
  }

  return {
    projects,
    currentProject,
    loading,
    error,
    fetchProjects,
    createProject,
    openProject,
    deleteProject,
    setCurrentProject,
  }
})

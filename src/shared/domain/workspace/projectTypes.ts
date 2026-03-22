export interface Project {
  id: string
  name: string
  description: string
  path: string
  created_at: number
  updated_at: number
  tags: string[]
  starred: boolean
}

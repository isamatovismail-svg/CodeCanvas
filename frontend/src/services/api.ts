import axios from 'axios';
import { Project, ProjectFile, ProjectVersion, AIEditResponse } from '../types';

const API_BASE = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const projectApi = {
  list: async (): Promise<Project[]> => {
    const res = await apiClient.get<Project[]>('/projects');
    return res.data;
  },

  get: async (id: string): Promise<Project> => {
    const res = await apiClient.get<Project>(`/projects/${id}`);
    return res.data;
  },

  create: async (data: { title: string; description?: string }): Promise<Project> => {
    const res = await apiClient.post<Project>('/projects', data);
    return res.data;
  },

  importPaste: async (data: {
    title: string;
    description?: string;
    html_code: string;
    css_code: string;
    js_code: string;
  }): Promise<Project> => {
    const res = await apiClient.post<Project>('/projects/import/paste', data);
    return res.data;
  },

  importZip: async (title: string, file: File): Promise<Project> => {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', file);
    const res = await apiClient.post<Project>('/projects/import/zip', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    const res = await apiClient.put<Project>(`/projects/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  exportZipUrl: (id: string): string => {
    return `${API_BASE}/projects/${id}/export/zip`;
  },
};

export const fileApi = {
  list: async (projectId: string): Promise<ProjectFile[]> => {
    const res = await apiClient.get<ProjectFile[]>(`/projects/${projectId}/files`);
    return res.data;
  },

  update: async (projectId: string, filename: string, content: string): Promise<ProjectFile> => {
    const res = await apiClient.put<ProjectFile>(`/projects/${projectId}/files/${encodeURIComponent(filename)}`, {
      content,
    });
    return res.data;
  },

  create: async (
    projectId: string,
    data: { name: string; file_type: string; content: string }
  ): Promise<ProjectFile> => {
    const res = await apiClient.post<ProjectFile>(`/projects/${projectId}/files`, data);
    return res.data;
  },

  delete: async (projectId: string, filename: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/files/${encodeURIComponent(filename)}`);
  },

  applyElementUpdate: async (
    projectId: string,
    payload: {
      element_id: string;
      text_content?: string;
      styles?: Record<string, string>;
      attributes?: Record<string, string>;
    }
  ) => {
    const res = await apiClient.post(`/projects/${projectId}/element-update`, payload);
    return res.data;
  },

  uploadAsset: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/projects/${projectId}/upload-asset`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

export const versionApi = {
  list: async (projectId: string): Promise<ProjectVersion[]> => {
    const res = await apiClient.get<ProjectVersion[]>(`/projects/${projectId}/versions`);
    return res.data;
  },

  create: async (projectId: string, title: string, description?: string): Promise<ProjectVersion> => {
    const res = await apiClient.post<ProjectVersion>(`/projects/${projectId}/versions`, {
      title,
      description,
    });
    return res.data;
  },

  restore: async (projectId: string, versionId: string): Promise<ProjectVersion> => {
    const res = await apiClient.post<ProjectVersion>(`/projects/${projectId}/versions/${versionId}/restore`);
    return res.data;
  },
};

export const aiApi = {
  edit: async (
    projectId: string,
    payload: {
      prompt: string;
      selected_element_id?: string;
      selected_element_tag?: string;
      selected_element_classes?: string;
    }
  ): Promise<AIEditResponse> => {
    const res = await apiClient.post<AIEditResponse>(`/projects/${projectId}/ai/edit`, payload);
    return res.data;
  },
};

export interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  file_type: 'html' | 'css' | 'js' | 'json' | 'asset';
  content: string;
  is_entry_point: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  title: string;
  description?: string;
  snapshot: {
    files: Array<{
      name: string;
      file_type: string;
      content: string;
      is_entry_point: boolean;
    }>;
  };
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  is_public: boolean;
  active_framework: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  files?: ProjectFile[];
  versions?: ProjectVersion[];
  file_count?: number;
}

export interface ElementStyles {
  backgroundColor?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: string;
  width?: string;
  height?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  border?: string;
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderRadius?: string;
  display?: string;
  flexDirection?: string;
  justifyContent?: string;
  alignItems?: string;
  opacity?: string;
  boxShadow?: string;
  [key: string]: string | undefined;
}

export interface SelectedElementInfo {
  elementId: string;
  tagName: string;
  id: string;
  className: string;
  textContent: string;
  rect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  attributes: {
    src?: string;
    alt?: string;
    href?: string;
    title?: string;
    placeholder?: string;
    [key: string]: string | undefined;
  };
  styles: ElementStyles;
}

export interface DOMTreeNode {
  elementId: string;
  tagName: string;
  id: string;
  className: string;
  textSnippet: string;
  children: DOMTreeNode[];
}

export interface CollaboratorUser {
  userId: string;
  userName: string;
  userColor: string;
  joinedAt: number;
  cursor?: { x: number; y: number };
  selectedElementId?: string;
}

export interface ConsoleLogEntry {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  filename?: string;
  lineno?: number;
}

export interface AIOperation {
  op_type: 'update_style' | 'update_text' | 'replace_attribute' | 'insert_element' | 'delete_element' | 'update_code';
  target_selector?: string;
  target_element_id?: string;
  styles?: Record<string, string>;
  text_content?: string;
  attributes?: Record<string, string>;
  explanation?: string;
}

export interface AIEditResponse {
  success: boolean;
  message: string;
  operations: AIOperation[];
  provider: string;
}

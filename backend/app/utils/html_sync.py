import re
import uuid
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup, Comment


def inject_stable_identifiers(html_content: str) -> str:
    """
    Ensures every HTML element in the body has a stable data-cc-id attribute.
    Preserves existing data-cc-id attributes.
    """
    if not html_content or not html_content.strip():
        return html_content

    try:
        soup = BeautifulSoup(html_content, "html.parser")
        
        counter = 1
        for tag in soup.find_all(True):
            if tag.name in ["html", "head", "meta", "title", "link", "script", "style"]:
                continue
            if not tag.has_attr("data-cc-id"):
                # Use tag name and counter for clean readability, e.g. h1-1, btn-2, div-3
                tag_prefix = tag.name[:3]
                tag["data-cc-id"] = f"cc-{tag_prefix}-{counter}"
                counter += 1

        return str(soup)
    except Exception:
        return html_content


def parse_inline_styles(style_str: str) -> Dict[str, str]:
    """Parse 'color: red; font-size: 16px' into dict."""
    styles = {}
    if not style_str:
        return styles
    parts = style_str.split(";")
    for part in parts:
        if ":" in part:
            k, v = part.split(":", 1)
            k = k.strip()
            v = v.strip()
            if k and v:
                styles[k] = v
    return styles


def serialize_inline_styles(styles: Dict[str, str]) -> str:
    """Serialize dict into 'color: red; font-size: 16px;'."""
    return "; ".join([f"{k}: {v}" for k, v in styles.items() if v is not None and v != ""])


def update_element_in_html(
    html_content: str,
    element_id: str,
    text_content: Optional[str] = None,
    styles: Optional[Dict[str, str]] = None,
    attributes: Optional[Dict[str, str]] = None,
    append_child_html: Optional[str] = None
) -> str:
    """
    Locates element by data-cc-id or id attribute, updates its text, styles, or attributes,
    and returns the updated clean HTML.
    """
    if not html_content:
        return html_content

    try:
        soup = BeautifulSoup(html_content, "html.parser")
        
        target = soup.find(attrs={"data-cc-id": element_id})
        if not target:
            target = soup.find(attrs={"id": element_id})

        if not target:
            return html_content

        # Update text content
        if text_content is not None:
            # If tag has child tags, we only update string nodes or direct string
            if list(target.children) and any(child.name for child in target.children):
                # Target has children tags (e.g. bold, icons). Replace first navigable string or update inner text
                first_text = None
                for child in target.children:
                    if isinstance(child, str) and not isinstance(child, Comment) and child.strip():
                        first_text = child
                        break
                if first_text:
                    first_text.replace_with(text_content)
                else:
                    target.string = text_content
            else:
                target.string = text_content

        # Update inline styles
        if styles:
            current_style_str = target.get("style", "")
            current_styles = parse_inline_styles(current_style_str)
            current_styles.update(styles)
            # Remove empty keys
            cleaned_styles = {k: v for k, v in current_styles.items() if v is not None and v != ""}
            if cleaned_styles:
                target["style"] = serialize_inline_styles(cleaned_styles)
            elif "style" in target.attrs:
                del target.attrs["style"]

        # Update attributes (e.g., src, alt, href, class)
        if attributes:
            for attr_name, attr_val in attributes.items():
                if attr_val is None:
                    if attr_name in target.attrs:
                        del target.attrs[attr_name]
                else:
                    target[attr_name] = attr_val

        # Append child element if requested
        if append_child_html:
            child_soup = BeautifulSoup(append_child_html, "html.parser")
            target.append(child_soup)

        return str(soup)
    except Exception:
        return html_content


def inject_preview_bridge(html_content: str, project_id: str) -> str:
    """
    Injects the CodeCanvas Visual Bridge runtime script and interactive CSS
    into the HTML so the preview iframe can communicate with the CodeCanvas UI.
    Also injects console capture to relay runtime errors.
    """
    if not html_content:
        html_content = "<!DOCTYPE html><html><head></head><body></body></html>"

    bridge_script = f"""
<!-- CodeCanvas Visual Editor Bridge & Error Monitor -->
<style id="codecanvas-preview-styles">
  [data-cc-id] {{
    transition: outline 0.15s ease-in-out;
  }}
  [data-cc-id]:hover {{
    outline: 2px dashed #3b82f6 !important;
    outline-offset: 2px !important;
    cursor: pointer !important;
  }}
  .cc-selected-element {{
    outline: 2px solid #2563eb !important;
    outline-offset: 2px !important;
    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.25) !important;
  }}
  .cc-editing-inline {{
    outline: 2px solid #10b981 !important;
    outline-offset: 2px !important;
    background-color: rgba(16, 185, 129, 0.05) !important;
  }}
</style>
<script id="codecanvas-preview-bridge">
(function() {{
  const PROJECT_ID = "{project_id}";
  let selectedElement = null;
  let isEditingText = false;

  // Capture Runtime Console Errors & Logs
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  function postMsg(type, payload) {{
    window.parent.postMessage({{
      source: "codecanvas-preview",
      projectId: PROJECT_ID,
      type: type,
      payload: payload
    }}, "*");
  }}

  console.error = function(...args) {{
    postMsg("console-log", {{ level: "error", message: args.map(a => String(a)).join(" "), timestamp: Date.now() }});
    originalError.apply(console, args);
  }};

  console.warn = function(...args) {{
    postMsg("console-log", {{ level: "warn", message: args.map(a => String(a)).join(" "), timestamp: Date.now() }});
    originalWarn.apply(console, args);
  }};

  console.log = function(...args) {{
    postMsg("console-log", {{ level: "info", message: args.map(a => String(a)).join(" "), timestamp: Date.now() }});
    originalLog.apply(console, args);
  }};

  window.addEventListener("error", function(e) {{
    postMsg("runtime-error", {{
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      timestamp: Date.now()
    }});
  }});

  // Extract computed styles for editor panel
  function extractElementInfo(el) {{
    if (!el) return null;
    const computed = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    
    return {{
      elementId: el.getAttribute("data-cc-id") || el.id || "",
      tagName: el.tagName.toLowerCase(),
      id: el.id || "",
      className: el.className || "",
      textContent: el.textContent || "",
      rect: {{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }},
      attributes: {{
        src: el.getAttribute("src") || "",
        alt: el.getAttribute("alt") || "",
        href: el.getAttribute("href") || "",
        title: el.getAttribute("title") || "",
        placeholder: el.getAttribute("placeholder") || ""
      }},
      styles: {{
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        textAlign: computed.textAlign,
        width: computed.width,
        height: computed.height,
        margin: computed.margin,
        marginTop: computed.marginTop,
        marginRight: computed.marginRight,
        marginBottom: computed.marginBottom,
        marginLeft: computed.marginLeft,
        padding: computed.padding,
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        border: computed.border,
        borderColor: computed.borderColor,
        borderWidth: computed.borderWidth,
        borderStyle: computed.borderStyle,
        borderRadius: computed.borderRadius,
        display: computed.display,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
        opacity: computed.opacity
      }}
    }};
  }}

  // DOM Click Selection Handler
  document.addEventListener("click", function(e) {{
    // Prevent default link navigation inside visual editor
    e.preventDefault();
    e.stopPropagation();

    const target = e.target.closest("[data-cc-id]") || e.target;
    if (!target || target === document.body || target === document.documentElement) return;

    if (selectedElement) {{
      selectedElement.classList.remove("cc-selected-element");
    }}
    selectedElement = target;
    selectedElement.classList.add("cc-selected-element");

    const info = extractElementInfo(selectedElement);
    postMsg("element-selected", info);
  }}, true);

  // Double-Click Inline Text Edit Handler
  document.addEventListener("dblclick", function(e) {{
    const target = e.target.closest("[data-cc-id]") || e.target;
    if (!target) return;
    
    // Enable contenteditable for instant inline editing
    target.setAttribute("contenteditable", "true");
    target.classList.add("cc-editing-inline");
    target.focus();
    isEditingText = true;

    function handleBlur() {{
      target.removeAttribute("contenteditable");
      target.classList.remove("cc-editing-inline");
      isEditingText = false;
      target.removeEventListener("blur", handleBlur);

      const elementId = target.getAttribute("data-cc-id") || target.id;
      const newText = target.innerText || target.textContent;
      postMsg("text-edited", {{
        elementId: elementId,
        newText: newText
      }});
    }}

    target.addEventListener("blur", handleBlur);
  }}, true);

  // Incoming Messages from Parent Window (Visual Editor Controls)
  window.addEventListener("message", function(event) {{
    const data = event.data;
    if (!data || data.target !== "codecanvas-preview") return;

    if (data.type === "select-element-by-id") {{
      const el = document.querySelector(`[data-cc-id="${{data.elementId}}"]`) || document.getElementById(data.elementId);
      if (el) {{
        if (selectedElement) selectedElement.classList.remove("cc-selected-element");
        selectedElement = el;
        selectedElement.classList.add("cc-selected-element");
        selectedElement.scrollIntoView({{ behavior: "smooth", block: "center" }});
        postMsg("element-selected", extractElementInfo(selectedElement));
      }}
    }} else if (data.type === "update-element-style") {{
      const el = document.querySelector(`[data-cc-id="${{data.elementId}}"]`) || document.getElementById(data.elementId);
      if (el && data.property) {{
        el.style[data.property] = data.value;
        postMsg("element-updated", extractElementInfo(el));
      }}
    }} else if (data.type === "update-element-attribute") {{
      const el = document.querySelector(`[data-cc-id="${{data.elementId}}"]`) || document.getElementById(data.elementId);
      if (el && data.attribute) {{
        el.setAttribute(data.attribute, data.value);
        postMsg("element-updated", extractElementInfo(el));
      }}
    }} else if (data.type === "update-element-text") {{
      const el = document.querySelector(`[data-cc-id="${{data.elementId}}"]`) || document.getElementById(data.elementId);
      if (el) {{
        el.textContent = data.text;
        postMsg("element-updated", extractElementInfo(el));
      }}
    }} else if (data.type === "get-dom-tree") {{
      function buildTree(node) {{
        if (!node || node.nodeType !== 1) return null;
        if (node.tagName.toLowerCase() === "script" || node.tagName.toLowerCase() === "style") return null;
        const children = [];
        for (let i = 0; i < node.children.length; i++) {{
          const childNode = buildTree(node.children[i]);
          if (childNode) children.push(childNode);
        }}
        return {{
          elementId: node.getAttribute("data-cc-id") || node.id || "",
          tagName: node.tagName.toLowerCase(),
          id: node.id || "",
          className: node.className || "",
          textSnippet: (node.innerText || "").slice(0, 30).trim(),
          children: children
        }};
      }}
      const bodyTree = buildTree(document.body);
      postMsg("dom-tree-response", {{ tree: bodyTree }});
    }}
  }});

  // Notify parent when preview is fully loaded and ready
  window.addEventListener("DOMContentLoaded", function() {{
    postMsg("preview-ready", {{ ready: true }});
  }});
  window.addEventListener("load", function() {{
    postMsg("preview-ready", {{ ready: true }});
  }});
}})();
</script>
"""
    if "</body>" in html_content:
        return html_content.replace("</body>", f"{bridge_script}</body>")
    else:
        return f"{html_content}{bridge_script}"

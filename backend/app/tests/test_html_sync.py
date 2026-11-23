import pytest
from app.utils.html_sync import (
    inject_stable_identifiers,
    update_element_in_html,
    parse_inline_styles,
    serialize_inline_styles,
    inject_preview_bridge
)


def test_inject_stable_identifiers():
    sample_html = "<div><h1>Title</h1><p>Description</p></div>"
    result = inject_stable_identifiers(sample_html)
    assert "data-cc-id=" in result
    assert "cc-h1-" in result or "cc-div-" in result
    assert "data-cc-id" in result


def test_parse_and_serialize_inline_styles():
    style_str = "color: red; font-size: 16px; margin: 10px;"
    parsed = parse_inline_styles(style_str)
    assert parsed["color"] == "red"
    assert parsed["font-size"] == "16px"
    assert parsed["margin"] == "10px"

    serialized = serialize_inline_styles({"color": "blue", "font-weight": "bold"})
    assert "color: blue" in serialized
    assert "font-weight: bold" in serialized


def test_update_element_text_in_html():
    sample_html = '<div data-cc-id="title-1">Old Title</div>'
    updated = update_element_in_html(
        sample_html,
        element_id="title-1",
        text_content="Brand New Awesome Title"
    )
    assert "Brand New Awesome Title" in updated
    assert "Old Title" not in updated


def test_update_element_styles_in_html():
    sample_html = '<button data-cc-id="btn-1" style="color: white;">Click Me</button>'
    updated = update_element_in_html(
        sample_html,
        element_id="btn-1",
        styles={"background-color": "#3b82f6", "font-size": "18px"}
    )
    assert "background-color: #3b82f6" in updated
    assert "font-size: 18px" in updated
    assert "color: white" in updated


def test_update_element_attributes_in_html():
    sample_html = '<img data-cc-id="img-1" src="old.jpg" alt="Old Image" />'
    updated = update_element_in_html(
        sample_html,
        element_id="img-1",
        attributes={"src": "https://example.com/new.png", "alt": "Fresh Replacement"}
    )
    assert 'src="https://example.com/new.png"' in updated
    assert 'alt="Fresh Replacement"' in updated


def test_inject_preview_bridge():
    sample_html = "<html><head></head><body><h1>Hello</h1></body></html>"
    bridged = inject_preview_bridge(sample_html, "test-proj-123")
    assert "codecanvas-preview-bridge" in bridged
    assert "codecanvas-preview-styles" in bridged
    assert "test-proj-123" in bridged

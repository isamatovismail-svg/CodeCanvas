class WSEvent:
    # Client to Server
    PROJECT_JOIN = "project.join"
    CODE_UPDATE = "code.update"
    ELEMENT_UPDATE = "element.update"
    ELEMENT_SELECT = "element.select"
    CURSOR_MOVE = "cursor.move"
    PROJECT_SAVE = "project.save"

    # Server to Client
    PROJECT_JOINED = "project.joined"
    CODE_UPDATED = "code.updated"
    ELEMENT_UPDATED = "element.updated"
    ELEMENT_SELECTED = "element.selected"
    CURSOR_MOVED = "cursor.moved"
    PROJECT_SAVED = "project.saved"
    USER_JOINED = "user.joined"
    USER_LEFT = "user.left"
    ERROR = "error"

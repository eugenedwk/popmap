"""
Modal dialogs for confirmations and forms.
"""
from textual.app import ComposeResult
from textual.screen import ModalScreen
from textual.widgets import Button, Static, Input, Select, Label, Checkbox
from textual.containers import Vertical, Horizontal, Grid


class ConfirmModal(ModalScreen[bool]):
    """A confirmation dialog modal."""

    DEFAULT_CSS = """
    ConfirmModal {
        align: center middle;
    }

    ConfirmModal > Vertical {
        width: 50;
        height: auto;
        border: thick $primary;
        background: $surface;
        padding: 1 2;
    }

    ConfirmModal .modal-title {
        text-style: bold;
        margin-bottom: 1;
    }

    ConfirmModal .modal-message {
        margin-bottom: 1;
    }

    ConfirmModal Horizontal {
        width: 100%;
        height: auto;
        align: right middle;
        margin-top: 1;
    }

    ConfirmModal Button {
        margin-left: 1;
    }
    """

    def __init__(
        self,
        title: str,
        message: str,
        confirm_label: str = "Confirm",
        cancel_label: str = "Cancel",
        confirm_variant: str = "primary",
    ) -> None:
        super().__init__()
        self._title = title
        self._message = message
        self._confirm_label = confirm_label
        self._cancel_label = cancel_label
        self._confirm_variant = confirm_variant

    def compose(self) -> ComposeResult:
        with Vertical():
            yield Static(self._title, classes="modal-title")
            yield Static(self._message, classes="modal-message")
            with Horizontal():
                yield Button(self._cancel_label, variant="default", id="modal-cancel")
                yield Button(self._confirm_label, variant=self._confirm_variant, id="modal-confirm")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "modal-confirm":
            self.dismiss(True)
        else:
            self.dismiss(False)


class FormModal(ModalScreen[dict | None]):
    """A form dialog modal for creating/editing items."""

    DEFAULT_CSS = """
    FormModal {
        align: center middle;
    }

    FormModal > Vertical {
        width: 70;
        height: auto;
        max-height: 80%;
        border: thick $primary;
        background: $surface;
        padding: 1 2;
    }

    FormModal .modal-title {
        text-style: bold;
        margin-bottom: 1;
    }

    FormModal .form-field {
        width: 100%;
        margin-bottom: 1;
    }

    FormModal Label {
        width: 100%;
        margin-bottom: 0;
    }

    FormModal Input {
        width: 100%;
    }

    FormModal Select {
        width: 100%;
    }

    FormModal Horizontal {
        width: 100%;
        height: auto;
        align: right middle;
        margin-top: 1;
    }

    FormModal Button {
        margin-left: 1;
    }
    """

    def __init__(
        self,
        title: str,
        fields: list[dict],
        initial_values: dict | None = None,
        submit_label: str = "Save",
    ) -> None:
        """
        Initialize FormModal.

        Args:
            title: Modal title
            fields: List of field definitions:
                    [{'id': 'name', 'label': 'Name', 'type': 'text', 'required': True}, ...]
                    Supported types: text, select, checkbox
                    For select: include 'options' list of (value, label) tuples
            initial_values: Dict of initial field values
            submit_label: Label for submit button
        """
        super().__init__()
        self._title = title
        self._fields = fields
        self._initial_values = initial_values or {}
        self._submit_label = submit_label

    def compose(self) -> ComposeResult:
        with Vertical():
            yield Static(self._title, classes="modal-title")

            for field in self._fields:
                field_id = field['id']
                label = field.get('label', field_id.title())
                field_type = field.get('type', 'text')
                required = field.get('required', False)
                initial = self._initial_values.get(field_id, '')

                with Vertical(classes="form-field"):
                    label_text = f"{label}{'*' if required else ''}"
                    yield Label(label_text)

                    if field_type == 'text':
                        yield Input(
                            value=str(initial) if initial else '',
                            placeholder=field.get('placeholder', ''),
                            id=f"field-{field_id}",
                        )
                    elif field_type == 'select':
                        options = field.get('options', [])
                        yield Select(
                            [(opt_label, opt_value) for opt_value, opt_label in options],
                            value=initial,
                            id=f"field-{field_id}",
                            allow_blank=not required,
                        )
                    elif field_type == 'checkbox':
                        yield Checkbox(
                            label,
                            value=bool(initial),
                            id=f"field-{field_id}",
                        )

            with Horizontal():
                yield Button("Cancel", variant="default", id="modal-cancel")
                yield Button(self._submit_label, variant="primary", id="modal-submit")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "modal-submit":
            values = self._collect_values()
            if self._validate(values):
                self.dismiss(values)
        elif event.button.id == "modal-cancel":
            self.dismiss(None)

    def _collect_values(self) -> dict:
        """Collect values from all form fields."""
        values = {}
        for field in self._fields:
            field_id = field['id']
            field_type = field.get('type', 'text')

            try:
                if field_type == 'checkbox':
                    widget = self.query_one(f"#field-{field_id}", Checkbox)
                    values[field_id] = widget.value
                elif field_type == 'select':
                    widget = self.query_one(f"#field-{field_id}", Select)
                    values[field_id] = widget.value
                else:
                    widget = self.query_one(f"#field-{field_id}", Input)
                    values[field_id] = widget.value
            except Exception:
                values[field_id] = None

        return values

    def _validate(self, values: dict) -> bool:
        """Validate required fields."""
        for field in self._fields:
            if field.get('required', False):
                field_id = field['id']
                value = values.get(field_id)
                if not value:
                    self.app.notify(
                        f"{field.get('label', field_id)} is required",
                        severity="error"
                    )
                    return False
        return True


class GiftSubscriptionModal(ModalScreen[dict | None]):
    """Modal for gifting a subscription to a user."""

    DEFAULT_CSS = """
    GiftSubscriptionModal {
        align: center middle;
    }

    GiftSubscriptionModal > Vertical {
        width: 60;
        height: auto;
        border: thick $primary;
        background: $surface;
        padding: 1 2;
    }

    GiftSubscriptionModal .modal-title {
        text-style: bold;
        margin-bottom: 1;
    }

    GiftSubscriptionModal .user-info {
        margin-bottom: 1;
        padding: 1;
        background: $surface-darken-1;
    }

    GiftSubscriptionModal .form-field {
        width: 100%;
        margin-bottom: 1;
    }

    GiftSubscriptionModal Label {
        width: 100%;
    }

    GiftSubscriptionModal Select {
        width: 100%;
    }

    GiftSubscriptionModal Horizontal {
        width: 100%;
        height: auto;
        align: right middle;
        margin-top: 1;
    }

    GiftSubscriptionModal Button {
        margin-left: 1;
    }
    """

    def __init__(
        self,
        username: str,
        email: str,
    ) -> None:
        super().__init__()
        self._username = username
        self._email = email

    def compose(self) -> ComposeResult:
        with Vertical():
            yield Static("Gift Premium Subscription", classes="modal-title")
            yield Static(f"User: {self._username} ({self._email})", classes="user-info")

            with Vertical(classes="form-field"):
                yield Label("Duration")
                yield Select(
                    [
                        ("30 Days", "30"),
                        ("60 Days", "60"),
                        ("90 Days (Recommended)", "90"),
                        ("180 Days", "180"),
                        ("1 Year", "365"),
                    ],
                    value="90",
                    id="gift-duration",
                    allow_blank=False,
                )

            yield Checkbox("Send notification email", value=True, id="gift-send-email")

            with Horizontal():
                yield Button("Cancel", variant="default", id="modal-cancel")
                yield Button("Gift Subscription", variant="success", id="modal-gift")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "modal-gift":
            duration_select = self.query_one("#gift-duration", Select)
            send_email = self.query_one("#gift-send-email", Checkbox)

            self.dismiss({
                'days': int(duration_select.value),
                'send_email': send_email.value,
            })
        elif event.button.id == "modal-cancel":
            self.dismiss(None)

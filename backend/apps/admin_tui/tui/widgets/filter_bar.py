"""
FilterBar widget for search and filtering.
"""
from textual.app import ComposeResult
from textual.widgets import Input, Select, Button, Static
from textual.containers import Horizontal
from textual.message import Message


class FilterBar(Static):
    """A horizontal bar with search input and filter dropdowns."""

    DEFAULT_CSS = """
    FilterBar {
        width: 100%;
        height: 3;
        dock: top;
        padding: 0 1;
    }

    FilterBar Horizontal {
        width: 100%;
        height: 100%;
        align: left middle;
    }

    FilterBar Input {
        width: 30;
        margin-right: 1;
    }

    FilterBar Select {
        width: 20;
        margin-right: 1;
    }

    FilterBar Button {
        min-width: 10;
    }

    FilterBar .new-button {
        background: $success;
    }
    """

    class FilterChanged(Message):
        """Message sent when filters change."""

        def __init__(
            self,
            search: str,
            filters: dict,
        ) -> None:
            self.search = search
            self.filters = filters
            super().__init__()

    class NewRequested(Message):
        """Message sent when new button is clicked."""
        pass

    def __init__(
        self,
        search_placeholder: str = "Search...",
        filters: list[tuple[str, str, list[tuple[str, str]]]] | None = None,
        show_new_button: bool = True,
        new_button_label: str = "New",
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
    ) -> None:
        """
        Initialize FilterBar.

        Args:
            search_placeholder: Placeholder text for search input
            filters: List of (id, label, options) tuples for filter dropdowns
                     options is a list of (value, label) tuples
            show_new_button: Whether to show the "New" button
            new_button_label: Label for the new button
        """
        super().__init__(name=name, id=id, classes=classes)
        self._search_placeholder = search_placeholder
        self._filters = filters or []
        self._show_new_button = show_new_button
        self._new_button_label = new_button_label

    def compose(self) -> ComposeResult:
        """Compose the filter bar layout."""
        with Horizontal():
            yield Input(
                placeholder=self._search_placeholder,
                id="filter-search",
            )

            for filter_id, label, options in self._filters:
                yield Select(
                    [(label, "")] + [(opt_label, opt_value) for opt_value, opt_label in options],
                    id=f"filter-{filter_id}",
                    allow_blank=False,
                )

            yield Button("Clear", variant="default", id="filter-clear")

            if self._show_new_button:
                yield Button(
                    self._new_button_label,
                    variant="success",
                    id="filter-new",
                    classes="new-button",
                )

    def on_input_changed(self, event: Input.Changed) -> None:
        """Handle search input changes."""
        if event.input.id == "filter-search":
            self._emit_filter_changed()

    def on_select_changed(self, event: Select.Changed) -> None:
        """Handle filter dropdown changes."""
        if event.select.id and event.select.id.startswith("filter-"):
            self._emit_filter_changed()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button presses."""
        if event.button.id == "filter-clear":
            self._clear_filters()
        elif event.button.id == "filter-new":
            self.post_message(self.NewRequested())

    def _emit_filter_changed(self) -> None:
        """Emit filter changed message."""
        search_input = self.query_one("#filter-search", Input)
        search = search_input.value

        filters = {}
        for filter_id, _, _ in self._filters:
            try:
                select = self.query_one(f"#filter-{filter_id}", Select)
                if select.value:
                    filters[filter_id] = select.value
            except Exception:
                pass

        self.post_message(self.FilterChanged(search=search, filters=filters))

    def _clear_filters(self) -> None:
        """Clear all filters."""
        search_input = self.query_one("#filter-search", Input)
        search_input.value = ""

        for filter_id, _, _ in self._filters:
            try:
                select = self.query_one(f"#filter-{filter_id}", Select)
                select.value = ""
            except Exception:
                pass

        self._emit_filter_changed()

    @property
    def search_value(self) -> str:
        """Get current search value."""
        return self.query_one("#filter-search", Input).value

    @property
    def filter_values(self) -> dict:
        """Get current filter values."""
        filters = {}
        for filter_id, _, _ in self._filters:
            try:
                select = self.query_one(f"#filter-{filter_id}", Select)
                if select.value:
                    filters[filter_id] = select.value
            except Exception:
                pass
        return filters

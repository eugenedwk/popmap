"""
StatCard widget for displaying metrics.
"""
from textual.app import ComposeResult
from textual.widgets import Static
from textual.containers import Vertical
from rich.text import Text


class StatCard(Static):
    """A card widget for displaying a metric with title and optional subtitle."""

    DEFAULT_CSS = """
    StatCard {
        width: 1fr;
        height: auto;
        min-height: 5;
        border: solid $primary;
        padding: 1 2;
        margin: 0 1;
    }

    StatCard .stat-title {
        color: $text-muted;
        text-style: bold;
    }

    StatCard .stat-value {
        color: $text;
        text-style: bold;
    }

    StatCard .stat-subtitle {
        color: $text-muted;
    }

    StatCard:hover {
        border: solid $secondary;
    }
    """

    def __init__(
        self,
        title: str,
        value: str | int,
        subtitle: str = "",
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
    ) -> None:
        super().__init__(name=name, id=id, classes=classes)
        self._title = title
        self._value = str(value)
        self._subtitle = subtitle

    def compose(self) -> ComposeResult:
        """Compose the stat card layout."""
        yield Static(self._title, classes="stat-title")
        yield Static(self._value, classes="stat-value")
        if self._subtitle:
            yield Static(self._subtitle, classes="stat-subtitle")

    def update_value(self, value: str | int, subtitle: str = "") -> None:
        """Update the displayed value."""
        self._value = str(value)
        self._subtitle = subtitle

        # Update the child widgets
        children = list(self.children)
        if len(children) >= 2:
            children[1].update(self._value)
        if len(children) >= 3 and self._subtitle:
            children[2].update(self._subtitle)

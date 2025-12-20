"""
Main Textual Application class for PopMap Admin Dashboard.
"""
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.widgets import Header, Footer

from .screens import (
    DashboardScreen,
    EventsScreen,
    BusinessesScreen,
    UsersScreen,
    SubscriptionsScreen,
    AnalyticsScreen,
)


class PopMapAdminApp(App):
    """PopMap Terminal Admin Dashboard."""

    TITLE = "PopMap Admin"
    SUB_TITLE = "Terminal Dashboard"
    CSS_PATH = "styles.tcss"

    BINDINGS = [
        Binding("d", "go_dashboard", "Dashboard", priority=True),
        Binding("e", "go_events", "Events", priority=True),
        Binding("b", "go_businesses", "Businesses", priority=True),
        Binding("u", "go_users", "Users", priority=True),
        Binding("s", "go_subscriptions", "Subscriptions", priority=True),
        Binding("a", "go_analytics", "Analytics", priority=True),
        Binding("q", "quit", "Quit", priority=True),
        Binding("f5", "refresh", "Refresh"),
    ]

    SCREENS = {
        "dashboard": DashboardScreen,
        "events": EventsScreen,
        "businesses": BusinessesScreen,
        "users": UsersScreen,
        "subscriptions": SubscriptionsScreen,
        "analytics": AnalyticsScreen,
    }

    def __init__(self, readonly: bool = False):
        super().__init__()
        self.readonly = readonly

    def on_mount(self) -> None:
        """Called when app is mounted."""
        self.push_screen(DashboardScreen())
        if self.readonly:
            self.notify("Read-only mode active", severity="warning")

    def _switch_to_screen(self, screen_name: str) -> None:
        """Switch to a named screen."""
        screen_class = self.SCREENS.get(screen_name)
        if screen_class:
            # Pop all screens and push the new one
            while len(self.screen_stack) > 1:
                self.pop_screen()
            if self.screen_stack:
                self.pop_screen()
            self.push_screen(screen_class())

    def action_go_dashboard(self) -> None:
        """Switch to dashboard screen."""
        self._switch_to_screen("dashboard")

    def action_go_events(self) -> None:
        """Switch to events screen."""
        self._switch_to_screen("events")

    def action_go_businesses(self) -> None:
        """Switch to businesses screen."""
        self._switch_to_screen("businesses")

    def action_go_users(self) -> None:
        """Switch to users screen."""
        self._switch_to_screen("users")

    def action_go_subscriptions(self) -> None:
        """Switch to subscriptions screen."""
        self._switch_to_screen("subscriptions")

    def action_go_analytics(self) -> None:
        """Switch to analytics screen."""
        self._switch_to_screen("analytics")

    async def action_refresh(self) -> None:
        """Refresh the current screen."""
        screen = self.screen
        if hasattr(screen, 'refresh_data'):
            await screen.refresh_data()
            self.notify("Data refreshed")

    def compose(self) -> ComposeResult:
        """Compose the main application layout."""
        yield Header()
        yield Footer()

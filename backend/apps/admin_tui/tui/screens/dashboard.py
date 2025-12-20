"""
Dashboard screen showing overview statistics.
"""
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Static, DataTable, Button
from textual.containers import Container, Horizontal, Vertical, ScrollableContainer
from textual.binding import Binding

from ..widgets import StatCard
from ..services import DataService


class DashboardScreen(Screen):
    """Main dashboard showing key statistics and pending items."""

    BINDINGS = [
        Binding("r", "refresh", "Refresh"),
        Binding("a", "approve_selected", "Approve"),
        Binding("x", "reject_selected", "Reject"),
    ]

    DEFAULT_CSS = """
    DashboardScreen {
        layout: vertical;
    }

    DashboardScreen .stats-row {
        height: 7;
        width: 100%;
        padding: 1;
    }

    DashboardScreen .section-title {
        text-style: bold;
        padding: 0 1;
        margin-top: 1;
    }

    DashboardScreen .pending-section {
        height: 1fr;
        padding: 0 1;
    }

    DashboardScreen DataTable {
        height: 100%;
    }
    """

    def compose(self) -> ComposeResult:
        yield Header()

        with ScrollableContainer():
            yield Static("Dashboard Overview", classes="section-title")

            with Horizontal(classes="stats-row"):
                yield StatCard("Events", "...", "Loading...", id="stat-events")
                yield StatCard("Businesses", "...", "Loading...", id="stat-businesses")
                yield StatCard("Users", "...", "Loading...", id="stat-users")
                yield StatCard("Subscriptions", "...", "Loading...", id="stat-subscriptions")

            yield Static("Pending Events", classes="section-title")

            with Container(classes="pending-section"):
                table = DataTable(id="pending-table")
                table.cursor_type = "row"
                yield table

        yield Footer()

    async def on_mount(self) -> None:
        """Load data when screen mounts."""
        await self.refresh_data()

    async def refresh_data(self) -> None:
        """Refresh all dashboard data."""
        # Load statistics
        stats = await DataService.get_dashboard_stats()

        # Update stat cards
        events_card = self.query_one("#stat-events", StatCard)
        events_card.update_value(
            stats['events']['total'],
            f"Pending: {stats['events']['pending']} | Today: {stats['events']['today']}"
        )

        businesses_card = self.query_one("#stat-businesses", StatCard)
        businesses_card.update_value(
            stats['businesses']['total'],
            f"Verified: {stats['businesses']['verified']}"
        )

        users_card = self.query_one("#stat-users", StatCard)
        users_card.update_value(
            stats['users']['total'],
            f"Business: {stats['users']['business_owners']} | Attendee: {stats['users']['attendees']}"
        )

        subscriptions_card = self.query_one("#stat-subscriptions", StatCard)
        subscriptions_card.update_value(
            stats['subscriptions']['active'],
            f"Trial: {stats['subscriptions']['trial']}"
        )

        # Load pending events
        pending = await DataService.get_pending_events(limit=10)
        await self._populate_pending_table(pending)

    async def _populate_pending_table(self, events: list) -> None:
        """Populate the pending events table."""
        table = self.query_one("#pending-table", DataTable)
        table.clear(columns=True)

        table.add_columns("ID", "Title", "Host", "Date", "Created")

        for event in events:
            table.add_row(
                str(event['id']),
                event['title'][:30],
                event['host'][:20],
                event['date'],
                event['created'],
                key=str(event['id']),
            )

        if not events:
            table.add_row("-", "No pending events", "-", "-", "-")

    async def action_refresh(self) -> None:
        """Refresh dashboard data."""
        await self.refresh_data()
        self.app.notify("Dashboard refreshed")

    async def action_approve_selected(self) -> None:
        """Approve the selected pending event."""
        if self.app.readonly:
            self.app.notify("Read-only mode", severity="warning")
            return

        table = self.query_one("#pending-table", DataTable)
        if table.cursor_row is not None:
            row_key = table.get_row_at(table.cursor_row)
            if row_key and row_key[0] != "-":
                event_id = int(row_key[0])
                success = await DataService.approve_event(event_id)
                if success:
                    self.app.notify(f"Event {event_id} approved")
                    await self.refresh_data()
                else:
                    self.app.notify("Failed to approve event", severity="error")

    async def action_reject_selected(self) -> None:
        """Reject the selected pending event."""
        if self.app.readonly:
            self.app.notify("Read-only mode", severity="warning")
            return

        table = self.query_one("#pending-table", DataTable)
        if table.cursor_row is not None:
            row_key = table.get_row_at(table.cursor_row)
            if row_key and row_key[0] != "-":
                event_id = int(row_key[0])
                success = await DataService.reject_event(event_id)
                if success:
                    self.app.notify(f"Event {event_id} rejected")
                    await self.refresh_data()
                else:
                    self.app.notify("Failed to reject event", severity="error")

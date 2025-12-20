"""
Events management screen.
"""
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Static, DataTable
from textual.containers import Container, Horizontal, Vertical, ScrollableContainer
from textual.binding import Binding

from ..widgets import FilterBar, ConfirmModal
from ..services import DataService


class EventsScreen(Screen):
    """Events listing and management screen."""

    BINDINGS = [
        Binding("r", "refresh", "Refresh"),
        Binding("a", "approve", "Approve"),
        Binding("x", "reject", "Reject"),
        Binding("delete", "delete", "Delete"),
        Binding("enter", "view_detail", "Details"),
        Binding("n", "next_page", "Next"),
        Binding("p", "prev_page", "Prev"),
    ]

    DEFAULT_CSS = """
    EventsScreen {
        layout: vertical;
    }

    EventsScreen .content-area {
        height: 1fr;
    }

    EventsScreen .list-section {
        width: 2fr;
        height: 100%;
        padding: 0 1;
    }

    EventsScreen .detail-section {
        width: 1fr;
        height: 100%;
        padding: 0 1;
        border-left: solid $primary;
    }

    EventsScreen .section-title {
        text-style: bold;
        padding: 0 1;
    }

    EventsScreen DataTable {
        height: 1fr;
    }

    EventsScreen .detail-content {
        padding: 1;
    }

    EventsScreen .detail-label {
        color: $text-muted;
    }

    EventsScreen .detail-value {
        margin-bottom: 1;
    }

    EventsScreen .page-info {
        height: 1;
        padding: 0 1;
        color: $text-muted;
    }
    """

    def __init__(self) -> None:
        super().__init__()
        self._current_page = 1
        self._total_pages = 1
        self._search = ""
        self._status_filter = ""
        self._selected_event = None

    def compose(self) -> ComposeResult:
        yield Header()

        yield FilterBar(
            search_placeholder="Search events...",
            filters=[
                ("status", "Status", [
                    ("pending", "Pending"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                    ("cancelled", "Cancelled"),
                ]),
            ],
            show_new_button=False,
            id="events-filter",
        )

        with Horizontal(classes="content-area"):
            with Vertical(classes="list-section"):
                yield Static("Events", classes="section-title")
                table = DataTable(id="events-table")
                table.cursor_type = "row"
                yield table
                yield Static("Page 1 of 1", id="page-info", classes="page-info")

            with Vertical(classes="detail-section"):
                yield Static("Event Details", classes="section-title")
                yield ScrollableContainer(
                    Static("Select an event to view details", id="detail-content"),
                    classes="detail-content",
                )

        yield Footer()

    async def on_mount(self) -> None:
        """Load data when screen mounts."""
        await self.refresh_data()

    async def refresh_data(self) -> None:
        """Refresh events list."""
        data = await DataService.get_events(
            search=self._search,
            status=self._status_filter,
            page=self._current_page,
        )

        self._total_pages = data['total_pages']
        await self._populate_table(data['items'])
        self._update_page_info()

    async def _populate_table(self, events: list) -> None:
        """Populate the events table."""
        table = self.query_one("#events-table", DataTable)
        table.clear(columns=True)

        table.add_columns("ID", "Title", "Host", "Date", "Status")

        for event in events:
            status_display = self._format_status(event['status'])
            table.add_row(
                str(event['id']),
                event['title'][:25],
                event['host'][:15],
                event['date'],
                status_display,
                key=str(event['id']),
            )

    def _format_status(self, status: str) -> str:
        """Format status with indicator."""
        indicators = {
            'pending': '[yellow]PENDING[/]',
            'approved': '[green]APPROVED[/]',
            'rejected': '[red]REJECTED[/]',
            'cancelled': '[gray]CANCELLED[/]',
        }
        return indicators.get(status, status.upper())

    def _update_page_info(self) -> None:
        """Update page info display."""
        info = self.query_one("#page-info", Static)
        info.update(f"Page {self._current_page} of {self._total_pages}")

    async def on_filter_bar_filter_changed(self, event: FilterBar.FilterChanged) -> None:
        """Handle filter changes."""
        self._search = event.search
        self._status_filter = event.filters.get("status", "")
        self._current_page = 1
        await self.refresh_data()

    async def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
        """Handle row selection."""
        if event.row_key:
            event_id = int(event.row_key.value)
            await self._load_detail(event_id)

    async def _load_detail(self, event_id: int) -> None:
        """Load and display event details."""
        detail = await DataService.get_event_detail(event_id)
        self._selected_event = detail

        if detail:
            content = f"""
[bold]Title:[/] {detail['title']}
[bold]Status:[/] {self._format_status(detail['status'])}

[bold]Host:[/] {detail['host']}
[bold]Businesses:[/] {', '.join(detail['businesses']) or '-'}

[bold]Location:[/]
{detail['location_name'] or '-'}
{detail['address'] or '-'}

[bold]Schedule:[/]
Start: {detail['start_datetime']}
End: {detail['end_datetime'] or '-'}

[bold]RSVPs:[/]
Going: {detail['rsvp_going']} | Interested: {detail['rsvp_interested']}

[bold]CTA:[/]
{detail['cta_text'] or '-'}
{detail['cta_url'] or '-'}

[bold]Created by:[/] {detail['created_by']}
[bold]Created at:[/] {detail['created_at']}

[bold]Description:[/]
{detail['description'] or '-'}
"""
            self.query_one("#detail-content", Static).update(content)
        else:
            self.query_one("#detail-content", Static).update("Event not found")

    async def action_refresh(self) -> None:
        """Refresh events data."""
        await self.refresh_data()
        self.app.notify("Events refreshed")

    async def action_approve(self) -> None:
        """Approve selected event."""
        if self.app.readonly:
            self.app.notify("Read-only mode", severity="warning")
            return

        if self._selected_event:
            success = await DataService.approve_event(self._selected_event['id'])
            if success:
                self.app.notify(f"Event {self._selected_event['id']} approved")
                await self.refresh_data()
            else:
                self.app.notify("Failed to approve event", severity="error")

    async def action_reject(self) -> None:
        """Reject selected event."""
        if self.app.readonly:
            self.app.notify("Read-only mode", severity="warning")
            return

        if self._selected_event:
            success = await DataService.reject_event(self._selected_event['id'])
            if success:
                self.app.notify(f"Event {self._selected_event['id']} rejected")
                await self.refresh_data()
            else:
                self.app.notify("Failed to reject event", severity="error")

    async def action_delete(self) -> None:
        """Delete selected event."""
        if self.app.readonly:
            self.app.notify("Read-only mode", severity="warning")
            return

        if self._selected_event:
            confirmed = await self.app.push_screen_wait(
                ConfirmModal(
                    title="Delete Event",
                    message=f"Are you sure you want to delete '{self._selected_event['title']}'?",
                    confirm_label="Delete",
                    confirm_variant="error",
                )
            )

            if confirmed:
                success = await DataService.delete_event(self._selected_event['id'])
                if success:
                    self.app.notify(f"Event deleted")
                    self._selected_event = None
                    await self.refresh_data()
                else:
                    self.app.notify("Failed to delete event", severity="error")

    async def action_next_page(self) -> None:
        """Go to next page."""
        if self._current_page < self._total_pages:
            self._current_page += 1
            await self.refresh_data()

    async def action_prev_page(self) -> None:
        """Go to previous page."""
        if self._current_page > 1:
            self._current_page -= 1
            await self.refresh_data()

    async def action_view_detail(self) -> None:
        """View selected event detail."""
        table = self.query_one("#events-table", DataTable)
        if table.cursor_row is not None:
            row = table.get_row_at(table.cursor_row)
            if row:
                event_id = int(row[0])
                await self._load_detail(event_id)

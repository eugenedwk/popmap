"""
Businesses management screen.
"""
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Static, DataTable
from textual.containers import Horizontal, Vertical, ScrollableContainer
from textual.binding import Binding

from ..widgets import FilterBar, ConfirmModal
from ..services import DataService


class BusinessesScreen(Screen):
    """Businesses listing and management screen."""

    BINDINGS = [
        Binding("r", "refresh", "Refresh"),
        Binding("v", "toggle_verified", "Toggle Verified"),
        Binding("delete", "delete", "Delete"),
        Binding("enter", "view_detail", "Details"),
        Binding("n", "next_page", "Next"),
        Binding("p", "prev_page", "Prev"),
    ]

    DEFAULT_CSS = """
    BusinessesScreen {
        layout: vertical;
    }

    BusinessesScreen .content-area {
        height: 1fr;
    }

    BusinessesScreen .list-section {
        width: 2fr;
        height: 100%;
        padding: 0 1;
    }

    BusinessesScreen .detail-section {
        width: 1fr;
        height: 100%;
        padding: 0 1;
        border-left: solid $primary;
    }

    BusinessesScreen .section-title {
        text-style: bold;
        padding: 0 1;
    }

    BusinessesScreen DataTable {
        height: 1fr;
    }

    BusinessesScreen .detail-content {
        padding: 1;
    }

    BusinessesScreen .page-info {
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
        self._verified_filter = None
        self._selected_business = None

    def compose(self) -> ComposeResult:
        yield Header()

        yield FilterBar(
            search_placeholder="Search businesses...",
            filters=[
                ("verified", "Verified", [
                    ("true", "Verified"),
                    ("false", "Not Verified"),
                ]),
            ],
            show_new_button=False,
            id="businesses-filter",
        )

        with Horizontal(classes="content-area"):
            with Vertical(classes="list-section"):
                yield Static("Businesses", classes="section-title")
                table = DataTable(id="businesses-table")
                table.cursor_type = "row"
                yield table
                yield Static("Page 1 of 1", id="page-info", classes="page-info")

            with Vertical(classes="detail-section"):
                yield Static("Business Details", classes="section-title")
                yield ScrollableContainer(
                    Static("Select a business to view details", id="detail-content"),
                    classes="detail-content",
                )

        yield Footer()

    async def on_mount(self) -> None:
        """Load data when screen mounts."""
        await self.refresh_data()

    async def refresh_data(self) -> None:
        """Refresh businesses list."""
        verified = None
        if self._verified_filter == "true":
            verified = True
        elif self._verified_filter == "false":
            verified = False

        data = await DataService.get_businesses(
            search=self._search,
            verified=verified,
            page=self._current_page,
        )

        self._total_pages = data['total_pages']
        await self._populate_table(data['items'])
        self._update_page_info()

    async def _populate_table(self, businesses: list) -> None:
        """Populate the businesses table."""
        table = self.query_one("#businesses-table", DataTable)
        table.clear(columns=True)

        table.add_columns("ID", "Name", "Owner", "Subdomain", "Verified")

        for biz in businesses:
            verified_display = "[green]Yes[/]" if biz['verified'] else "[red]No[/]"
            table.add_row(
                str(biz['id']),
                biz['name'][:20],
                biz['owner'][:20],
                biz['subdomain'][:15],
                verified_display,
                key=str(biz['id']),
            )

    def _update_page_info(self) -> None:
        """Update page info display."""
        info = self.query_one("#page-info", Static)
        info.update(f"Page {self._current_page} of {self._total_pages}")

    async def on_filter_bar_filter_changed(self, event: FilterBar.FilterChanged) -> None:
        """Handle filter changes."""
        self._search = event.search
        self._verified_filter = event.filters.get("verified", "")
        self._current_page = 1
        await self.refresh_data()

    async def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
        """Handle row selection."""
        if event.row_key:
            business_id = int(event.row_key.value)
            await self._load_detail(business_id)

    async def _load_detail(self, business_id: int) -> None:
        """Load and display business details."""
        detail = await DataService.get_business_detail(business_id)
        self._selected_business = detail

        if detail:
            sub_info = "None"
            if detail['subscription']:
                sub = detail['subscription']
                sub_info = f"{sub['plan']} ({sub['status']}) - Ends: {sub['ends']}"

            content = f"""
[bold]Name:[/] {detail['name']}
[bold]Verified:[/] {'[green]Yes[/]' if detail['is_verified'] else '[red]No[/]'}

[bold]Owner:[/] {detail['owner']}
[bold]Contact:[/] {detail['contact_email'] or '-'}
[bold]Phone:[/] {detail['contact_phone'] or '-'}

[bold]Website:[/] {detail['website'] or '-'}
[bold]Instagram:[/] {detail['instagram_url'] or '-'}
[bold]TikTok:[/] {detail['tiktok_url'] or '-'}

[bold]Subdomain:[/] {detail['custom_subdomain'] or '-'}
[bold]Available for Hire:[/] {'Yes' if detail['available_for_hire'] else 'No'}

[bold]Categories:[/] {', '.join(detail['categories']) or '-'}

[bold]Subscription:[/] {sub_info}

[bold]Created:[/] {detail['created_at']}

[bold]Description:[/]
{detail['description'] or '-'}
"""
            self.query_one("#detail-content", Static).update(content)
        else:
            self.query_one("#detail-content", Static).update("Business not found")

    async def action_refresh(self) -> None:
        """Refresh businesses data."""
        await self.refresh_data()
        self.app.notify("Businesses refreshed")

    async def action_toggle_verified(self) -> None:
        """Toggle verified status of selected business."""
        if self.app.readonly:
            self.app.notify("Read-only mode", severity="warning")
            return

        if self._selected_business:
            new_status = await DataService.toggle_business_verified(self._selected_business['id'])
            if new_status is not None:
                status_text = "verified" if new_status else "unverified"
                self.app.notify(f"Business marked as {status_text}")
                await self.refresh_data()
                await self._load_detail(self._selected_business['id'])
            else:
                self.app.notify("Failed to update business", severity="error")

    async def action_delete(self) -> None:
        """Delete selected business."""
        if self.app.readonly:
            self.app.notify("Read-only mode", severity="warning")
            return

        if self._selected_business:
            confirmed = await self.app.push_screen_wait(
                ConfirmModal(
                    title="Delete Business",
                    message=f"Are you sure you want to delete '{self._selected_business['name']}'?",
                    confirm_label="Delete",
                    confirm_variant="error",
                )
            )

            if confirmed:
                success = await DataService.delete_business(self._selected_business['id'])
                if success:
                    self.app.notify("Business deleted")
                    self._selected_business = None
                    await self.refresh_data()
                else:
                    self.app.notify("Failed to delete business", severity="error")

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
        """View selected business detail."""
        table = self.query_one("#businesses-table", DataTable)
        if table.cursor_row is not None:
            row = table.get_row_at(table.cursor_row)
            if row:
                business_id = int(row[0])
                await self._load_detail(business_id)

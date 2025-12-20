"""
Subscriptions management screen.
"""
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Static, DataTable
from textual.containers import Horizontal, Vertical, ScrollableContainer
from textual.binding import Binding

from ..widgets import FilterBar, ConfirmModal
from ..services import DataService


class SubscriptionsScreen(Screen):
    """Subscriptions listing and management screen."""

    BINDINGS = [
        Binding("r", "refresh", "Refresh"),
        Binding("c", "cancel_subscription", "Cancel"),
        Binding("enter", "view_detail", "Details"),
        Binding("n", "next_page", "Next"),
        Binding("p", "prev_page", "Prev"),
    ]

    DEFAULT_CSS = """
    SubscriptionsScreen {
        layout: vertical;
    }

    SubscriptionsScreen .content-area {
        height: 1fr;
    }

    SubscriptionsScreen .list-section {
        width: 2fr;
        height: 100%;
        padding: 0 1;
    }

    SubscriptionsScreen .detail-section {
        width: 1fr;
        height: 100%;
        padding: 0 1;
        border-left: solid $primary;
    }

    SubscriptionsScreen .section-title {
        text-style: bold;
        padding: 0 1;
    }

    SubscriptionsScreen DataTable {
        height: 1fr;
    }

    SubscriptionsScreen .detail-content {
        padding: 1;
    }

    SubscriptionsScreen .page-info {
        height: 1;
        padding: 0 1;
        color: $text-muted;
    }

    SubscriptionsScreen .plans-section {
        height: auto;
        padding: 1;
        border-top: solid $primary;
    }
    """

    def __init__(self) -> None:
        super().__init__()
        self._current_page = 1
        self._total_pages = 1
        self._search = ""
        self._status_filter = ""
        self._selected_subscription = None
        self._plans = []

    def compose(self) -> ComposeResult:
        yield Header()

        yield FilterBar(
            search_placeholder="Search subscriptions...",
            filters=[
                ("status", "Status", [
                    ("active", "Active"),
                    ("trialing", "Trial"),
                    ("canceled", "Canceled"),
                    ("past_due", "Past Due"),
                ]),
            ],
            show_new_button=False,
            id="subscriptions-filter",
        )

        with Horizontal(classes="content-area"):
            with Vertical(classes="list-section"):
                yield Static("Subscriptions", classes="section-title")
                table = DataTable(id="subscriptions-table")
                table.cursor_type = "row"
                yield table
                yield Static("Page 1 of 1", id="page-info", classes="page-info")

            with Vertical(classes="detail-section"):
                yield Static("Subscription Details", classes="section-title")
                yield ScrollableContainer(
                    Static("Select a subscription to view details", id="detail-content"),
                    classes="detail-content",
                )

                yield Static("Available Plans", classes="section-title")
                yield Static("Loading plans...", id="plans-content", classes="plans-section")

        yield Footer()

    async def on_mount(self) -> None:
        """Load data when screen mounts."""
        await self.refresh_data()
        await self._load_plans()

    async def refresh_data(self) -> None:
        """Refresh subscriptions list."""
        data = await DataService.get_subscriptions(
            search=self._search,
            status=self._status_filter,
            page=self._current_page,
        )

        self._total_pages = data['total_pages']
        await self._populate_table(data['items'])
        self._update_page_info()

    async def _populate_table(self, subscriptions: list) -> None:
        """Populate the subscriptions table."""
        table = self.query_one("#subscriptions-table", DataTable)
        table.clear(columns=True)

        table.add_columns("ID", "User", "Plan", "Status", "Ends", "Gift")

        for sub in subscriptions:
            status_display = self._format_status(sub['status'])
            gift_display = "[yellow]Yes[/]" if sub['is_gifted'] else "No"
            table.add_row(
                str(sub['id']),
                sub['user'][:20],
                sub['plan'][:10],
                status_display,
                sub['period_end'],
                gift_display,
                key=str(sub['id']),
            )

    def _format_status(self, status: str) -> str:
        """Format status with color."""
        colors = {
            'active': '[green]Active[/]',
            'trialing': '[blue]Trial[/]',
            'canceled': '[red]Canceled[/]',
            'past_due': '[yellow]Past Due[/]',
            'unpaid': '[red]Unpaid[/]',
        }
        return colors.get(status, status)

    def _update_page_info(self) -> None:
        """Update page info display."""
        info = self.query_one("#page-info", Static)
        info.update(f"Page {self._current_page} of {self._total_pages}")

    async def _load_plans(self) -> None:
        """Load subscription plans."""
        self._plans = await DataService.get_subscription_plans()

        content = ""
        for plan in self._plans:
            features = []
            if plan['max_events'] == 'Unlimited':
                features.append("Unlimited events")
            else:
                features.append(f"{plan['max_events']} events/mo")
            if plan['subdomain']:
                features.append("Subdomain")
            if plan['analytics']:
                features.append("Analytics")
            if plan['featured']:
                features.append("Featured")

            content += f"[bold]{plan['name']}[/]: ${plan['price']}/mo\n"
            content += f"  {', '.join(features)}\n\n"

        self.query_one("#plans-content", Static).update(content or "No plans found")

    async def on_filter_bar_filter_changed(self, event: FilterBar.FilterChanged) -> None:
        """Handle filter changes."""
        self._search = event.search
        self._status_filter = event.filters.get("status", "")
        self._current_page = 1
        await self.refresh_data()

    async def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
        """Handle row selection."""
        if event.row_key:
            # Store the selected subscription from the current data
            table = self.query_one("#subscriptions-table", DataTable)
            row_index = table.cursor_row
            if row_index is not None:
                row = table.get_row_at(row_index)
                if row:
                    self._selected_subscription = {
                        'id': int(row[0]),
                        'user': row[1],
                        'plan': row[2],
                        'status': row[3],
                        'period_end': row[4],
                        'is_gifted': 'Yes' in row[5],
                    }
                    await self._show_detail()

    async def _show_detail(self) -> None:
        """Display subscription details."""
        if self._selected_subscription:
            sub = self._selected_subscription
            content = f"""
[bold]Subscription ID:[/] {sub['id']}
[bold]User:[/] {sub['user']}
[bold]Plan:[/] {sub['plan']}
[bold]Status:[/] {sub['status']}
[bold]Period End:[/] {sub['period_end']}
[bold]Gifted:[/] {'Yes' if sub['is_gifted'] else 'No'}

[dim]Press C to cancel this subscription[/]
"""
            self.query_one("#detail-content", Static).update(content)

    async def action_refresh(self) -> None:
        """Refresh subscriptions data."""
        await self.refresh_data()
        self.app.notify("Subscriptions refreshed")

    async def action_cancel_subscription(self) -> None:
        """Cancel selected subscription."""
        if self.app.readonly:
            self.app.notify("Read-only mode", severity="warning")
            return

        if not self._selected_subscription:
            self.app.notify("Select a subscription first", severity="warning")
            return

        if 'Canceled' in self._selected_subscription['status']:
            self.app.notify("Subscription already canceled", severity="warning")
            return

        confirmed = await self.app.push_screen_wait(
            ConfirmModal(
                title="Cancel Subscription",
                message=f"Cancel subscription for {self._selected_subscription['user']}?",
                confirm_label="Cancel Subscription",
                confirm_variant="error",
            )
        )

        if confirmed:
            success = await DataService.cancel_subscription(self._selected_subscription['id'])
            if success:
                self.app.notify("Subscription canceled")
                self._selected_subscription = None
                await self.refresh_data()
            else:
                self.app.notify("Failed to cancel subscription", severity="error")

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
        """View selected subscription detail."""
        await self._show_detail()

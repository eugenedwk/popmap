"""
Users management screen.
"""
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Static, DataTable
from textual.containers import Horizontal, Vertical, ScrollableContainer
from textual.binding import Binding

from ..widgets import FilterBar, GiftSubscriptionModal
from ..services import DataService


class UsersScreen(Screen):
    """Users listing and management screen."""

    BINDINGS = [
        Binding("r", "refresh", "Refresh"),
        Binding("g", "gift_subscription", "Gift Sub"),
        Binding("enter", "view_detail", "Details"),
        Binding("n", "next_page", "Next"),
        Binding("p", "prev_page", "Prev"),
    ]

    DEFAULT_CSS = """
    UsersScreen {
        layout: vertical;
    }

    UsersScreen .content-area {
        height: 1fr;
    }

    UsersScreen .list-section {
        width: 2fr;
        height: 100%;
        padding: 0 1;
    }

    UsersScreen .detail-section {
        width: 1fr;
        height: 100%;
        padding: 0 1;
        border-left: solid $primary;
    }

    UsersScreen .section-title {
        text-style: bold;
        padding: 0 1;
    }

    UsersScreen DataTable {
        height: 1fr;
    }

    UsersScreen .detail-content {
        padding: 1;
    }

    UsersScreen .page-info {
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
        self._role_filter = ""
        self._selected_user = None

    def compose(self) -> ComposeResult:
        yield Header()

        yield FilterBar(
            search_placeholder="Search users...",
            filters=[
                ("role", "Role", [
                    ("business_owner", "Business Owner"),
                    ("attendee", "Attendee"),
                ]),
            ],
            show_new_button=False,
            id="users-filter",
        )

        with Horizontal(classes="content-area"):
            with Vertical(classes="list-section"):
                yield Static("Users", classes="section-title")
                table = DataTable(id="users-table")
                table.cursor_type = "row"
                yield table
                yield Static("Page 1 of 1", id="page-info", classes="page-info")

            with Vertical(classes="detail-section"):
                yield Static("User Details", classes="section-title")
                yield ScrollableContainer(
                    Static("Select a user to view details", id="detail-content"),
                    classes="detail-content",
                )

        yield Footer()

    async def on_mount(self) -> None:
        """Load data when screen mounts."""
        await self.refresh_data()

    async def refresh_data(self) -> None:
        """Refresh users list."""
        data = await DataService.get_users(
            search=self._search,
            role=self._role_filter,
            page=self._current_page,
        )

        self._total_pages = data['total_pages']
        await self._populate_table(data['items'])
        self._update_page_info()

    async def _populate_table(self, users: list) -> None:
        """Populate the users table."""
        table = self.query_one("#users-table", DataTable)
        table.clear(columns=True)

        table.add_columns("ID", "Username", "Email", "Role", "Premium")

        for user in users:
            premium_display = "[green]Yes[/]" if user['has_premium'] else "[red]No[/]"
            table.add_row(
                str(user['id']),
                user['username'][:15],
                user['email'][:25],
                user['role'],
                premium_display,
                key=str(user['id']),
            )

    def _update_page_info(self) -> None:
        """Update page info display."""
        info = self.query_one("#page-info", Static)
        info.update(f"Page {self._current_page} of {self._total_pages}")

    async def on_filter_bar_filter_changed(self, event: FilterBar.FilterChanged) -> None:
        """Handle filter changes."""
        self._search = event.search
        self._role_filter = event.filters.get("role", "")
        self._current_page = 1
        await self.refresh_data()

    async def on_data_table_row_selected(self, event: DataTable.RowSelected) -> None:
        """Handle row selection."""
        if event.row_key:
            user_id = int(event.row_key.value)
            await self._load_detail(user_id)

    async def _load_detail(self, user_id: int) -> None:
        """Load and display user details."""
        detail = await DataService.get_user_detail(user_id)
        self._selected_user = detail

        if detail:
            sub_info = "None"
            if detail['subscription']:
                sub = detail['subscription']
                gifted = " [yellow](Gifted)[/]" if sub['is_gifted'] else ""
                sub_info = f"{sub['plan']} ({sub['status']}){gifted}\nExpires: {sub['period_end']}"

            content = f"""
[bold]Username:[/] {detail['username']}
[bold]Email:[/] {detail['email']}
[bold]Name:[/] {detail['first_name']} {detail['last_name']}

[bold]Role:[/] {detail['role']}
[bold]Staff:[/] {'Yes' if detail['is_staff'] else 'No'}
[bold]Active:[/] {'Yes' if detail['is_active'] else 'No'}

[bold]Joined:[/] {detail['date_joined']}
[bold]Last Login:[/] {detail['last_login']}

[bold]Subscription:[/]
{sub_info}

[bold]Businesses:[/]
{chr(10).join(detail['businesses']) if detail['businesses'] else 'None'}
"""
            self.query_one("#detail-content", Static).update(content)
        else:
            self.query_one("#detail-content", Static).update("User not found")

    async def action_refresh(self) -> None:
        """Refresh users data."""
        await self.refresh_data()
        self.app.notify("Users refreshed")

    async def action_gift_subscription(self) -> None:
        """Gift subscription to selected user."""
        if self.app.readonly:
            self.app.notify("Read-only mode", severity="warning")
            return

        if not self._selected_user:
            self.app.notify("Select a user first", severity="warning")
            return

        # Check if user already has subscription
        if self._selected_user.get('subscription'):
            self.app.notify("User already has an active subscription", severity="warning")
            return

        result = await self.app.push_screen_wait(
            GiftSubscriptionModal(
                username=self._selected_user['username'],
                email=self._selected_user['email'],
            )
        )

        if result:
            gift_result = await DataService.gift_subscription(
                user_id=self._selected_user['id'],
                days=result['days'],
                send_email=result['send_email'],
            )

            if gift_result['success']:
                self.app.notify(
                    f"Gifted {gift_result['plan']} to {self._selected_user['username']} "
                    f"(expires: {gift_result['expires']})"
                )
                await self._load_detail(self._selected_user['id'])
            else:
                self.app.notify(gift_result['error'], severity="error")

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
        """View selected user detail."""
        table = self.query_one("#users-table", DataTable)
        if table.cursor_row is not None:
            row = table.get_row_at(table.cursor_row)
            if row:
                user_id = int(row[0])
                await self._load_detail(user_id)

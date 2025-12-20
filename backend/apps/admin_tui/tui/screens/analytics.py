"""
Analytics dashboard screen (read-only).
"""
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Static, Select
from textual.containers import Horizontal, Vertical, ScrollableContainer
from textual.binding import Binding

from ..widgets import StatCard
from ..services import DataService


class AnalyticsScreen(Screen):
    """Analytics dashboard screen showing metrics (read-only)."""

    BINDINGS = [
        Binding("r", "refresh", "Refresh"),
        Binding("7", "set_period_7", "7 Days"),
        Binding("3", "set_period_30", "30 Days"),
        Binding("9", "set_period_90", "90 Days"),
    ]

    DEFAULT_CSS = """
    AnalyticsScreen {
        layout: vertical;
    }

    AnalyticsScreen .period-selector {
        height: 3;
        padding: 0 1;
        align: left middle;
    }

    AnalyticsScreen .stats-row {
        height: 7;
        width: 100%;
        padding: 1;
    }

    AnalyticsScreen .section-title {
        text-style: bold;
        padding: 0 1;
        margin-top: 1;
    }

    AnalyticsScreen .metrics-section {
        height: 1fr;
        padding: 0 1;
    }

    AnalyticsScreen .top-lists {
        height: auto;
        padding: 1;
    }

    AnalyticsScreen .top-list {
        width: 1fr;
        padding: 0 1;
    }

    AnalyticsScreen .interactions-section {
        height: auto;
        padding: 1;
    }
    """

    def __init__(self) -> None:
        super().__init__()
        self._period_days = 30

    def compose(self) -> ComposeResult:
        yield Header()

        with Horizontal(classes="period-selector"):
            yield Static("Period: ", id="period-label")
            yield Select(
                [
                    ("Last 7 Days", "7"),
                    ("Last 30 Days", "30"),
                    ("Last 90 Days", "90"),
                ],
                value="30",
                id="period-select",
                allow_blank=False,
            )

        with ScrollableContainer():
            yield Static("Overview", classes="section-title")

            with Horizontal(classes="stats-row"):
                yield StatCard("Total Views", "...", "Loading...", id="stat-views")
                yield StatCard("Unique Visitors", "...", "Loading...", id="stat-unique")
                yield StatCard("Mobile", "...", "Loading...", id="stat-mobile")

            yield Static("Top Content", classes="section-title")

            with Horizontal(classes="top-lists"):
                with Vertical(classes="top-list"):
                    yield Static("[bold]Top Events[/]")
                    yield Static("Loading...", id="top-events")

                with Vertical(classes="top-list"):
                    yield Static("[bold]Top Businesses[/]")
                    yield Static("Loading...", id="top-businesses")

            yield Static("Interactions", classes="section-title")
            yield Static("Loading...", id="interactions", classes="interactions-section")

        yield Footer()

    async def on_mount(self) -> None:
        """Load data when screen mounts."""
        await self.refresh_data()

    async def on_select_changed(self, event: Select.Changed) -> None:
        """Handle period selection change."""
        if event.select.id == "period-select":
            self._period_days = int(event.value)
            await self.refresh_data()

    async def refresh_data(self) -> None:
        """Refresh analytics data."""
        data = await DataService.get_analytics_summary(days=self._period_days)

        # Update stat cards
        views_card = self.query_one("#stat-views", StatCard)
        views_card.update_value(
            f"{data['total_views']:,}",
            f"Last {data['period_days']} days"
        )

        unique_card = self.query_one("#stat-unique", StatCard)
        unique_card.update_value(
            f"{data['unique_views']:,}",
            f"Unique sessions"
        )

        mobile_card = self.query_one("#stat-mobile", StatCard)
        mobile_card.update_value(
            f"{data['mobile_percent']}%",
            f"{data['mobile_views']:,} mobile views"
        )

        # Update top events
        events_content = ""
        for i, event in enumerate(data['top_events'][:5], 1):
            events_content += f"{i}. Event #{event['object_id']} ({event['views']} views)\n"
        if not events_content:
            events_content = "No data"
        self.query_one("#top-events", Static).update(events_content)

        # Update top businesses
        businesses_content = ""
        for i, biz in enumerate(data['top_businesses'][:5], 1):
            businesses_content += f"{i}. Business #{biz['object_id']} ({biz['views']} views)\n"
        if not businesses_content:
            businesses_content = "No data"
        self.query_one("#top-businesses", Static).update(businesses_content)

        # Update interactions
        interactions = data.get('interactions', {})
        if interactions:
            interactions_content = ""
            for interaction_type, count in sorted(interactions.items(), key=lambda x: -x[1]):
                formatted_type = interaction_type.replace('_', ' ').title()
                interactions_content += f"[bold]{formatted_type}:[/] {count:,}\n"
            self.query_one("#interactions", Static).update(interactions_content)
        else:
            self.query_one("#interactions", Static).update("No interaction data")

    async def action_refresh(self) -> None:
        """Refresh analytics data."""
        await self.refresh_data()
        self.app.notify("Analytics refreshed")

    async def action_set_period_7(self) -> None:
        """Set period to 7 days."""
        self._period_days = 7
        self.query_one("#period-select", Select).value = "7"
        await self.refresh_data()

    async def action_set_period_30(self) -> None:
        """Set period to 30 days."""
        self._period_days = 30
        self.query_one("#period-select", Select).value = "30"
        await self.refresh_data()

    async def action_set_period_90(self) -> None:
        """Set period to 90 days."""
        self._period_days = 90
        self.query_one("#period-select", Select).value = "90"
        await self.refresh_data()

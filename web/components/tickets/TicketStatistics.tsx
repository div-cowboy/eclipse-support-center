"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MessageSquare,
} from "lucide-react";

interface TicketStats {
  total: number;
  byStatus: {
    new: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  };
  byPriority: {
    high: number;
    urgent: number;
  };
}

interface TicketStatisticsProps {
  organizationId: string;
}

export function TicketStatistics({ organizationId }: TicketStatisticsProps) {
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [organizationId]);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/tickets/stats?organizationId=${organizationId}`
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error loading ticket stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeTickets =
    stats.byStatus.new + stats.byStatus.open + stats.byStatus.inProgress;
  const resolvedTickets = stats.byStatus.resolved + stats.byStatus.closed;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Tickets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TicketIcon className="h-4 w-4" />
            Total Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </CardContent>
      </Card>

      {/* Active Tickets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{activeTickets}</div>
          <p className="text-xs text-muted-foreground mt-1">
            New: {stats.byStatus.new} • Open: {stats.byStatus.open} • In Progress: {stats.byStatus.inProgress}
          </p>
        </CardContent>
      </Card>

      {/* Resolved Tickets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Resolved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{resolvedTickets}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Resolved: {stats.byStatus.resolved} • Closed: {stats.byStatus.closed}
          </p>
        </CardContent>
      </Card>

      {/* High Priority */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            High Priority
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {stats.byPriority.high + stats.byPriority.urgent}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            High: {stats.byPriority.high} • Urgent: {stats.byPriority.urgent}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";
import { Button } from "@/components/shadcn/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";
import { Badge } from "@/components/shadcn/ui/badge";
import {
  Edit,
  Trash2,
  Plus,
  FileText,
  Code,
  Book,
  HelpCircle,
  Wrench,
  GraduationCap,
} from "lucide-react";

interface ContextBlock {
  id: string;
  title: string;
  content: string;
  type:
    | "TEXT"
    | "CODE"
    | "DOCUMENTATION"
    | "FAQ"
    | "TROUBLESHOOTING"
    | "TUTORIAL";
  metadata?: any;
  vectorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ContextBlockListProps {
  contextBlocks: ContextBlock[];
  onEdit: (contextBlock: ContextBlock) => void;
  onDelete: (contextBlockId: string) => void;
  onAdd: () => void;
  loading?: boolean;
}

export function ContextBlockList({
  contextBlocks,
  onEdit,
  onDelete,
  onAdd,
  loading = false,
}: ContextBlockListProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "TEXT":
        return <FileText className="h-4 w-4" />;
      case "CODE":
        return <Code className="h-4 w-4" />;
      case "DOCUMENTATION":
        return <Book className="h-4 w-4" />;
      case "FAQ":
        return <HelpCircle className="h-4 w-4" />;
      case "TROUBLESHOOTING":
        return <Wrench className="h-4 w-4" />;
      case "TUTORIAL":
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "TEXT":
        return "bg-blue-100 text-blue-800";
      case "CODE":
        return "bg-green-100 text-green-800";
      case "DOCUMENTATION":
        return "bg-purple-100 text-purple-800";
      case "FAQ":
        return "bg-yellow-100 text-yellow-800";
      case "TROUBLESHOOTING":
        return "bg-red-100 text-red-800";
      case "TUTORIAL":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Context Blocks</CardTitle>
          <CardDescription>Loading knowledge base...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">
              Loading context blocks...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Context Blocks</CardTitle>
            <CardDescription>
              Manage your chatbot's knowledge base. These blocks are vectorized
              for intelligent responses.
            </CardDescription>
          </div>
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Context Block
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {contextBlocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-6 mb-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No context blocks yet
            </h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Add knowledge blocks to train your chatbot. These will be stored
              in a vector database for intelligent responses.
            </p>
            <Button onClick={onAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Context Block
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content Preview</TableHead>
                  <TableHead>Vector Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contextBlocks.map((contextBlock) => (
                  <TableRow key={contextBlock.id}>
                    <TableCell className="font-medium">
                      {contextBlock.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${getTypeColor(
                          contextBlock.type
                        )} flex items-center w-fit`}
                      >
                        {getTypeIcon(contextBlock.type)}
                        <span className="ml-1">{contextBlock.type}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs">
                      {truncateContent(contextBlock.content)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          contextBlock.vectorId ? "default" : "secondary"
                        }
                        className="flex items-center w-fit"
                      >
                        {contextBlock.vectorId ? "Vectorized" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(contextBlock.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(contextBlock)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(contextBlock.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

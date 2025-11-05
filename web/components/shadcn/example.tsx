import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";

export function ShadcnExample() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">shadcn/ui Setup Complete!</h1>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Example Card</CardTitle>
          <CardDescription>
            This demonstrates that shadcn/ui is working correctly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Enter some text..." />
          <div className="flex gap-2">
            <Button>Primary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="secondary">Secondary Button</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


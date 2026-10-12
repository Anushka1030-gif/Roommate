import Card from '../components/ui/Card.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function ChatsPage() {
  return (
    <div className="max-w-2xl mx-auto py-6">
      <Card className="p-8 text-center space-y-4">
        <Badge variant="primary" size="md">
          Step 11 Foundation
        </Badge>
        <Card.Title as="h1" className="text-3xl font-bold">
          Messages & Direct Chats
        </Card.Title>
        <p className="text-slate-600 max-w-lg mx-auto">
          Real-time Socket.IO chat messaging, read receipts, and icebreaker suggestions. Coming in Step 11.
        </p>
      </Card>
    </div>
  );
}

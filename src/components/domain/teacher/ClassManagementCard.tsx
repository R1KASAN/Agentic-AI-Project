import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, KeyRound, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ClassManagementCardProps {
    classId: string;
    className: string;
    joinCode: string;
    isActive: boolean;
    onRegenerateCode: (id: string) => Promise<void>;
}

export function ClassManagementCard({ classId, className, joinCode, isActive, onRegenerateCode }: ClassManagementCardProps) {
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(joinCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRegenerate = async () => {
        setIsLoading(true);
        try {
            await onRegenerateCode(classId);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="h-full">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="flex justify-between items-center text-lg">
                    {className}
                    {!isActive && <span className="text-xs font-semibold px-2 py-1 bg-muted rounded-full text-muted-foreground">Archived</span>}
                </CardTitle>
                <CardDescription>Class ID: {classId.substring(0, 8)}...</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4" />
                        Student Join Code
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-secondary/30 border rounded-md px-3 py-2 font-mono text-lg font-bold text-center tracking-widest flex items-center justify-center">
                            {joinCode || '-------'}
                        </div>
                        <Button variant="outline" size="icon" onClick={handleCopy} disabled={!joinCode}>
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={handleRegenerate} disabled={isLoading}>
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                <div className="pt-2">
                    <Button variant="secondary" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Class Settings
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

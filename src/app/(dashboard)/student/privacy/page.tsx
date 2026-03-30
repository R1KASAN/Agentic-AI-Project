import { ShieldCheck, EyeOff, Lock, Database } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const RETENTION_DAYS = 60;

export default function StudentPrivacyPage() {
    return (
        <div className="space-y-8">
            <div className="text-center space-y-4 mb-8">
                <div className="mx-auto w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shadow-inner">
                    <ShieldCheck className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                    <span className="block">ความเป็นส่วนตัวของคุณ มาก่อนเสมอ</span>
                    <span className="block text-lg font-medium text-muted-foreground mt-1">Your Privacy, First.</span>
                </h1>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    <span className="block">Class Climate Agent ถูกสร้างมาเพื่อปกป้องตัวตนของคุณ ขณะช่วยให้ครูปรับปรุงห้องเรียน</span>
                    <span className="block text-sm mt-1">Built from the ground up to protect your identity while helping your teacher improve the class.</span>
                </p>
            </div>

            <div className="grid gap-6">
                <Card className="border-2 border-transparent hover:border-indigo-100 transition-colors">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                            <EyeOff className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle>
                                <span className="block">การไม่เปิดเผยตัวตนอย่างเข้มงวด (กฎ n ≥ 3)</span>
                                <span className="block text-sm font-normal text-muted-foreground">Strict Anonymity (n ≥ 3 Rule)</span>
                            </CardTitle>
                            <CardDescription>
                                <span className="block">ครูจะไม่เห็นคำตอบส่วนตัวของคุณ</span>
                                <span className="block text-xs">Your teacher never sees individual answers.</span>
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-2">
                        <p>เราประมวลผลความคิดเห็นเป็นกลุ่ม ข้อมูลจะแสดงก็ต่อเมื่อมีนักเรียนอย่างน้อย <strong>3 คน</strong> ส่งเช็คอิน เพื่อให้แน่ใจว่าคุณจะไม่ถูกระบุตัวตนได้</p>
                        <p className="text-sm opacity-80">We process feedback in groups. Data is locked until at least <strong>3 students</strong> have submitted, guaranteeing you cannot be singled out.</p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-transparent hover:border-indigo-100 transition-colors">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle>
                                <span className="block">ข้อความเปิดถูกกรองโดย AI</span>
                                <span className="block text-sm font-normal text-muted-foreground">AI-Redacted Free Text</span>
                            </CardTitle>
                            <CardDescription>
                                <span className="block">สิ่งที่คุณเขียนจะถูกกรองก่อนที่ครูจะอ่าน</span>
                                <span className="block text-xs">What you write is filtered before the teacher reads it.</span>
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-2">
                        <p>ข้อความที่คุณเขียนจะไม่ถูกแสดงโดยตรงต่อครู AI ที่ปลอดภัยจะอ่านความคิดเห็นทั้งหมด ลบข้อมูลที่ระบุตัวตน และสร้าง &quot;คำแนะนำการดำเนินการ&quot; สรุปให้ครู</p>
                        <p className="text-sm opacity-80">Optional text is never shown directly to your teacher. Our secure AI reads all comments, removes identifying info, and generates summarized action suggestions.</p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-transparent hover:border-indigo-100 transition-colors">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle>
                                <span className="block">ลบข้อมูลอัตโนมัติใน {RETENTION_DAYS} วัน</span>
                                <span className="block text-sm font-normal text-muted-foreground">{RETENTION_DAYS}-Day Data Deletion</span>
                            </CardTitle>
                            <CardDescription>
                                <span className="block">เราไม่เก็บข้อมูลของคุณตลอดไป</span>
                                <span className="block text-xs">We don&apos;t hold onto your data forever.</span>
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="text-muted-foreground leading-relaxed space-y-2">
                        <p>ข้อความของคุณจะถูกลบโดยอัตโนมัติหลังจาก <strong>{RETENTION_DAYS} วัน</strong> เราเก็บเฉพาะค่าเฉลี่ยนิรนามสำหรับติดตามแนวโน้มภาพรวมเท่านั้น</p>
                        <p className="text-sm opacity-80">Your text comments are automatically deleted after <strong>{RETENTION_DAYS} days</strong>. We only keep anonymous numerical averages to track trends.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

import { Header } from "@/components/header";
import { UserProfile } from "@/components/user-profile";
import { ReportForm } from "@/components/report-form";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-2xl mx-auto px-4 py-4">
        <UserProfile name="ทดสอบ ระบบ" unit="สฟฟ.บ้านนา" />

        <div className="mt-4">
          <ReportForm />
        </div>
      </main>
    </div>
  );
}

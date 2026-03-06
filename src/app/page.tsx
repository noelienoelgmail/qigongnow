import HourlyPlayer from "@/components/HourlyPlayer";

export default function Home() {
  return (
    <div className="space-y-10">
      <div className="text-center space-y-3 pt-6">
        <h1 className="text-4xl font-bold text-emerald-400 tracking-tight">
          QiGong Now
        </h1>
        <p className="text-stone-400 text-lg max-w-xl mx-auto">
          Every hour on the hour, a practice begins. Join anonymously or{" "}
          <a href="/login" className="text-emerald-400 underline underline-offset-2">
            sign in
          </a>{" "}
          to practice with your group.
        </p>
      </div>

      <HourlyPlayer
        apiUrl="/api/playlist?type=public"
        label="Community practice — live now"
      />

      <div className="border-t border-stone-800 pt-8 text-center space-y-3">
        <p className="text-stone-400">
          Have a practice group?{" "}
          <a href="/login" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
            Sign in
          </a>{" "}
          to access your group&apos;s private sessions.
        </p>
        <p className="text-stone-500 text-sm">
          New here?{" "}
          <a href="/register" className="text-stone-300 hover:text-white underline underline-offset-2">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[#f6f8fb] px-4">
      <div className="w-full max-w-md rounded-[12px] border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <p className="text-[12.5px] font-semibold text-primary">Trường Tiểu học Sơn Tây</p>
        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight">Đăng nhập hệ thống</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Đăng nhập bằng tài khoản cán bộ — không dùng email. Phạm vi dữ liệu theo vai trò và nơi công tác.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

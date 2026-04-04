import SosButton from "@/components/ui/SosButton";

export default function CitizenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen">
            {/* ... Phần Header/Sidebar (nếu có) của bạn ... */}

            <main>
                {children}
            </main>

            {/* Gắn nút SOS nổi vào đây để nó luôn hiển thị */}
            <SosButton />
        </div>
    );
}
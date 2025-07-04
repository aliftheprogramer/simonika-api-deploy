import { Icon } from "@iconify/react";

const menuItems = [
  { name: "Dashboard", icon: "mdi:view-dashboard", path: "#dashboard" },
  { name: "Notifikasi", icon: "mdi:bell-outline", path: "#notifications" },
  { name: "Histori", icon: "mdi:history", path: "#history" },
  { name: "Pengaturan", icon: "mdi:cog-outline", path: "#settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-white border-r shadow-sm p-4 flex flex-col">
      <div className="text-xl font-bold text-center text-green-600 mb-8 flex items-center justify-center gap-2">
        <Icon icon="mdi:sprout-outline" width="24" />
        Smart Farming
      </div>
      <nav className="flex flex-col gap-1">
        {menuItems.map((item) => (
          <a
            key={item.name}
            href={item.path}
            className="flex items-center gap-3 px-4 py-2 text-gray-600 rounded-lg hover:bg-green-50 hover:text-green-600"
          >
            <Icon icon={item.icon} width="20" />
            {item.name}
          </a>
        ))}
      </nav>
    </aside>
  );
}

import { LogoutButton } from "@/components/logout-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  email: string;
  name?: string;
  avatar_url?: string;
}

export const Header: React.FC<HeaderProps> = ({ email, name, avatar_url }) => {
  return (
    <header className="bg-gray-800 text-white px-6 py-3 flex items-center justify-between shadow-md">
      <h1 className="text-xl font-bold">DevMate</h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            Hello <span className="font-semibold">{name || email}</span>
          </span>
          <Avatar>
            <AvatarImage src={avatar_url} alt={name || email} />
            <AvatarFallback>
              {name
                ? name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                : "?"}
            </AvatarFallback>
          </Avatar>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
};

interface Props {
  seed: string;
  size?: "sm" | "md" | "lg";
}

export function PersonaAvatar({ seed, size = "md" }: Props) {
  const sizeMap = { sm: 20, md: 32, lg: 48 };
  const px = sizeMap[size];
  return (
    <img
      src={`https://api.dicebear.com/9.x/identicon/svg?seed=${seed}`}
      alt=""
      width={px}
      height={px}
      className="shrink-0 rounded-full bg-gray-700"
    />
  );
}

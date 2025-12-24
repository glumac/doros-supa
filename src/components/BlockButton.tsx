import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useBlockUserMutation, useUnblockUserMutation } from "../hooks/useMutations";
import { useBlockStatus } from "../hooks/useFollowStatus";

interface BlockButtonProps {
  targetUserId: string;
  targetUserName?: string;
  className?: string;
  onChanged?: (next: { iBlocked: boolean; theyBlocked: boolean }) => void;
}

export default function BlockButton({
  targetUserId,
  targetUserName,
  className = "",
  onChanged,
}: BlockButtonProps) {
  const { user } = useAuth();
  const blockMutation = useBlockUserMutation();
  const unblockMutation = useUnblockUserMutation();

  const { data: status, isLoading } = useBlockStatus(user?.id, targetUserId);

  const isSelf = !!user?.id && user.id === targetUserId;
  const iBlocked = !!status?.iBlocked;
  const theyBlocked = !!status?.theyBlocked;

  const disabled = isLoading || blockMutation.isPending || unblockMutation.isPending;

  const label = useMemo(() => {
    if (disabled) return iBlocked ? "Unblocking..." : "Blocking...";
    return iBlocked ? "Unblock" : "Block";
  }, [disabled, iBlocked]);

  async function handleClick() {
    if (!user || isSelf) return;

    if (!iBlocked) {
      const name = targetUserName || "this user";
      if (!confirm(`Are you sure you want to block ${name}? They will not be able to follow you or see your content.`)) {
        return;
      }

      await blockMutation.mutateAsync({ blockerId: user.id, blockedId: targetUserId });
      onChanged?.({ iBlocked: true, theyBlocked });
      return;
    }

    await unblockMutation.mutateAsync({ blockerId: user.id, blockedId: targetUserId });
    onChanged?.({ iBlocked: false, theyBlocked });
  }

  // No auth or self: no action
  if (!user || isSelf) return null;

  const base =
    "cq-block-button cq-block-button-inline inline-flex items-center justify-center bg-transparent border-none p-0 text-sm font-semibold text-black underline underline-offset-2 hover:text-gray-700 transition";

  const disabledClasses = disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`${base} ${disabledClasses} ${className} ${iBlocked ? "cq-block-button-unblock" : "cq-block-button-block"}`}
    >
      {label}
    </button>
  );
}

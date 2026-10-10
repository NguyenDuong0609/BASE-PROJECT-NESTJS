export const PERMISSION_CODES = {
	FLASH_CARDS_READ: 'flash-cards:read',
	FLASH_CARDS_CREATE: 'flash-cards:create',
	FLASH_CARDS_UPDATE: 'flash-cards:update',
	FLASH_CARDS_DELETE: 'flash-cards:delete',
} as const;

export type PermissionCode =
	(typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];

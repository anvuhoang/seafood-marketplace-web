/** The signed-in user, without the password hash. Profile details live under /account/profile. */
export class AuthUserDto {
  /** @example "2f9c1b7a-4e0d-4c55-9b8e-61a3d0f7c2b4" */
  id: string;
  /** @example "lan.nguyen@example.com" */
  email: string;
  /** @example "Nguyễn Thị Lan" */
  fullName: string;
  /** @example "0901000001" */
  phone: string | null;
  avatarUrl: string | null;
  /**
   * CUSTOMER, VENDOR or ADMIN.
   * @example "CUSTOMER"
   */
  role: string;
  /** @example "ACTIVE" */
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthResponseDto {
  user: AuthUserDto;
  /**
   * JWT to send as `Authorization: Bearer <token>`.
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  accessToken: string;
}

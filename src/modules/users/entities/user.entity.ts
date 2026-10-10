import { BaseEntity } from '@modules/shared/base/base.entity';
import {
	BeforeInsert,
	BeforeUpdate,
	Entity,
	Column,
	ManyToOne,
	OneToMany,
	JoinColumn,
} from 'typeorm';
import { Exclude, Expose, Type, Transform } from 'class-transformer';
import { ApiHideProperty } from '@nestjs/swagger';
import * as bcrypt from 'bcryptjs';

// OUTER
import { UserRole } from '@modules/user-roles/entities/user-role.entity';

// INNER
import { Address } from './address.entity';

export enum GENDER {
	MALE = 'Male',
	FEMALE = 'Female',
	OTHER = 'Other',
}

export enum LANGUAGES {
	ENGLISH = 'English',
	FRENCH = 'French',
	JAPANESE = 'Japanese',
	KOREAN = 'Korean',
	SPANISH = 'Spanish',
}

export enum AuthProvider {
	LOCAL = 'local',
	GOOGLE = 'google',
}

@Entity('users')
export class User extends BaseEntity {
	@BeforeInsert()
	@BeforeUpdate()
	async hashPassword(): Promise<void> {
		if (this.password && !/^\$2[aby]\$\d{2}\$/.test(this.password)) {
			this.password = await bcrypt.hash(this.password, 12);
		}
	}

	@Exclude()
	@Column({ nullable: true })
	friendly_id?: number;

	@Column({ length: 60 })
	first_name: string;

	@Column({ length: 60 })
	last_name: string;

	@Column({ unique: true })
	email: string;

	@Column('simple-array', { nullable: true })
	interested_languages?: LANGUAGES[];

	@Column({ nullable: true })
	phone_number?: string;

	@Column({ unique: true })
	username: string;

	@Exclude()
	@Column({ nullable: true })
	@ApiHideProperty()
	password: string;

	@Exclude()
	@Column({ type: 'varchar', length: 255, nullable: true, unique: true })
	@ApiHideProperty()
	googleId: string;

	@Column({
		type: 'enum',
		enum: AuthProvider,
		enumName: 'user_auth_provider_enum',
		default: AuthProvider.LOCAL,
	})
	authProvider: AuthProvider;

	@Column({ default: false })
	isEmailVerified: boolean;

	@Column({
		default:
			'https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png',
	})
	avatar?: string;

	@Column({ type: 'date', nullable: true })
	date_of_birth?: Date;

	@Column({
		type: 'enum',
		enum: GENDER,
		enumName: 'user_gender_enum',
		nullable: true,
	})
	gender: GENDER;

	@Column({ default: 0 })
	point?: number;

	@ManyToOne(() => UserRole, { nullable: false, eager: true })
	@JoinColumn({ name: 'role_id' })
	@Type(() => UserRole)
	@Transform(({ value }) => value?.name, { toClassOnly: true })
	role: UserRole;

	@Column({ nullable: true })
	headline?: string;

	@OneToMany(() => Address, (address) => address.user, { cascade: true })
	@Type(() => Address)
	address?: Address[];

	@Column({ nullable: true, default: null })
	@Exclude()
	@ApiHideProperty()
	stripe_customer_id?: string;

	@Column({ nullable: true })
	@Exclude()
	@ApiHideProperty()
	current_refresh_token?: string | null;

	@Column({ nullable: true })
	@Exclude()
	@ApiHideProperty()
	twoFactorAuthenticationSecret?: string | null;

	@Column({ default: false })
	isTwoFactorAuthenticationEnabled: boolean;

	@Column({ name: 'two_factor_last_counter', type: 'bigint', nullable: true })
	@ApiHideProperty()
	twoFactorLastCounter: string | null;

	@Expose({ name: 'full_name' })
	get fullName(): string {
		return `${this.first_name} ${this.last_name}`;
	}

	@Expose({ name: 'default_address' })
	get defaultAddress(): string | undefined {
		if (this.address && this.address.length > 0) {
			const addr = this.address[0];
			return `${addr.street ? addr.street + ' ' : ''}${addr.city} ${
				addr.state
			} ${addr.country}`;
		}
		return undefined;
	}
}

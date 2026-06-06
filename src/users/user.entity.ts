import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}

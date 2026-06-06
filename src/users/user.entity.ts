import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @ApiProperty({ format: 'uuid', description: '用户唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'alice@example.com', description: '用户邮箱' })
  @Column({ unique: true, length: 255 })
  email: string;

  @ApiProperty({ example: 'Alice', description: '用户名' })
  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  password: string;

  @ApiProperty({ example: true, description: '是否激活' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ type: 'string', format: 'date-time', description: '创建时间' })
  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;
}

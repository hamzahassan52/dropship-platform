import { ConflictException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../../common/email/email.service';

export interface SignupDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface SocialLoginDto {
  email: string;
  name?: string;
  provider: 'google' | 'facebook' | 'apple';
  providerId: string;
  avatar?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
  };
  token: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    console.log('[AuthService] Signup request for email:', dto.email);
    
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      console.log('[AuthService] User already exists:', dto.email);
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    console.log('[AuthService] Password hashed successfully');

    // Combine first name and last name
    const fullName = `${dto.firstName || ''} ${dto.lastName || ''}`.trim();

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashedPassword,
        name: fullName,
        firstName: dto.firstName || '',
        lastName: dto.lastName || '',
      },
    });

    this.logger.log(`User created successfully: ${user.id}`);

    // Generate token
    const token = this.generateToken(user.id, user.email);
    this.logger.log('Token generated successfully');

    // Send beautiful Welcome email (async, don't wait)
    this.sendWelcomeEmailAsync(user.email, fullName || 'there');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
      token,
    };
  }

  /**
   * Send welcome email asynchronously (non-blocking)
   */
  private async sendWelcomeEmailAsync(email: string, customerName: string): Promise<void> {
    try {
      await this.emailService.sendWelcomeEmail(email, {
        customerName,
        email,
        shopUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        discountCode: 'WELCOME10',
        discountPercent: 10,
      });
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.warn(`Failed to send welcome email to ${email}: ${error}`);
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    console.log('[AuthService] Login request for email:', dto.email);
    
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      console.log('[AuthService] User not found:', dto.email);
      throw new UnauthorizedException('Invalid email or password');
    }

    console.log('[AuthService] User found, verifying password');
    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      console.log('[AuthService] Invalid password for user:', dto.email);
      throw new UnauthorizedException('Invalid email or password');
    }

    console.log('[AuthService] Password verified successfully');
    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate token
    const token = this.generateToken(user.id, user.email);
    console.log('[AuthService] Token generated successfully');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        plan: true,
        createdAt: true,
        _count: {
          select: {
            stores: true,
            orders: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, plan: true },
    });
  }

  async socialLogin(dto: SocialLoginDto): Promise<AuthResponse> {
    // Check if user exists with this email
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    let isNewUser = false;

    if (!user) {
      // Create new user from social login
      user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          firstName: dto.name || dto.email.split('@')[0],
          lastName: '',
          name: dto.name || dto.email.split('@')[0],
          avatar: dto.avatar,
          password: '', // No password for social login
          isVerified: true, // Social login users are verified
        },
      });
      isNewUser = true;
    } else {
      // Update user info if changed
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: dto.name || user.firstName,
          lastName: user.lastName || '',
          name: dto.name || user.name,
          avatar: dto.avatar || user.avatar,
          lastLoginAt: new Date(),
        },
      });
    }

    // Generate token
    const token = this.generateToken(user.id, user.email);

    // Send welcome email for new social users
    if (isNewUser) {
      this.sendWelcomeEmailAsync(user.email, user.name || 'there');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
      token,
    };
  }

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}

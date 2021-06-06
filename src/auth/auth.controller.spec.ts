import { build, fake, perBuild, sequence } from '@jackfranklin/test-data-bot';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock } from 'jest-mock-extended';
import { Repository } from 'typeorm';

import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const userBuilder = build<Partial<User>>({
  fields: {
    id: sequence(),
    name: fake(f => f.name.findName()),
    email: fake(f => f.internet.exampleEmail()),
    createdAt: perBuild(() => new Date()),
    updatedAt: perBuild(() => new Date()),
  },
  postBuild: u => new User(u),
});

describe('Auth Controller', () => {
  let controller: AuthController;
  const repositoryMock = mock<Repository<User>>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: repositoryMock,
        },
        {
          provide: 'JwtService',
          useValue: {
            sign(payload: Record<'sub', string>) {
              return payload.sub
                .split('')
                .reduce(
                  (prev, current) => prev + current.charCodeAt(0).toString(16),
                  '',
                );
            },
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register a new user', async () => {
    expect.assertions(3);
    const register = {
      name: 'John Doe',
      email: 'john@doe.me',
      password: 'Pa$$w0rd',
    };
    repositoryMock.save.mockResolvedValueOnce(
      userBuilder({ overrides: register }) as User,
    );

    await expect(controller.register(register)).resolves.not.toHaveProperty('password');
  });

  it('should log in an user', async () => {
    expect.assertions(3);
    const user = userBuilder({
      overrides: {
        name: 'John Doe',
        email: 'john@doe.me',
      },
    });

    await expect(controller.login(user as User)).resolves.not.toHaveProperty('password');
  });

  it('should got me logged', () => {
    const user = userBuilder({
      overrides: {
        name: 'John Doe',
        email: 'john@doe.me',
      },
    });

    expect(controller.me(user as User)).toEqual(user);
  });
});

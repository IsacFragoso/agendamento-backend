export type TestUser = {
    sub: number;
    tipo_conta: string;
};
export declare function createTestApp(): Promise<{
    app: import("@nestjs/common").INestApplication<any>;
    usersService: {
        create: jest.Mock<any, any, any>;
        findAll: jest.Mock<any, any, any>;
        findOne: jest.Mock<any, any, any>;
        update: jest.Mock<any, any, any>;
        remove: jest.Mock<any, any, any>;
        upsertProfile: jest.Mock<any, any, any>;
    };
    servicesService: {
        createCategory: jest.Mock<any, any, any>;
        findCategories: jest.Mock<any, any, any>;
        updateCategory: jest.Mock<any, any, any>;
        removeCategory: jest.Mock<any, any, any>;
        create: jest.Mock<any, any, any>;
        findAll: jest.Mock<any, any, any>;
        findByProvider: jest.Mock<any, any, any>;
        update: jest.Mock<any, any, any>;
        remove: jest.Mock<any, any, any>;
    };
    schedulesService: {
        findByProvider: jest.Mock<any, any, any>;
        update: jest.Mock<any, any, any>;
        clear: jest.Mock<any, any, any>;
    };
    appointmentsService: {
        create: jest.Mock<any, any, any>;
        findAllForUser: jest.Mock<any, any, any>;
        findOneForUser: jest.Mock<any, any, any>;
        findByClient: jest.Mock<any, any, any>;
        findByProvider: jest.Mock<any, any, any>;
        updateStatus: jest.Mock<any, any, any>;
        createReview: jest.Mock<any, any, any>;
        findReview: jest.Mock<any, any, any>;
        updateReview: jest.Mock<any, any, any>;
        removeReview: jest.Mock<any, any, any>;
    };
    setUser(user: TestUser): void;
    setAuthenticated(value: boolean): void;
    reset(): void;
}>;
//# sourceMappingURL=test-app.d.ts.map
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { HashService } from 'src/utils/hash/hash.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UserService,
        private hashService: HashService) {}

    async signIn(email: string, password:string): Promise<any> {
        const user = await this.usersService.findOne({ email: email });

        if (user && await this.hashService.comparePassword(password, user.password)) {
            const { password, ...result } = user;

            return result;
        }
    }
}

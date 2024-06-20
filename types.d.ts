//Declare module bcrypt

declare module "bcrypt" {
  function hash(password: string, saltRounds: number): Promise<string>;
  function compare(password: string, hash: string): Promise<boolean>;
}

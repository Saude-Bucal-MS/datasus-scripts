export class FileAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileAlreadyExistsError';
  }
}

export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}

export class DataAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataAlreadyExistsError';
  }
}

export class InvalidPAUFYYMMError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPAUFYYMMError';
  }
}

export class BlastDbfNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlastDbfNotFoundError';
  }
}

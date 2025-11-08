export class FileAlreadyExistsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileAlreadyExistsError';
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFileTypeError';
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

export class InvalidPatternError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPatternError';
  }
}

export class BlastDbfNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlastDbfNotFoundError';
  }
}

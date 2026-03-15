package com.smartbanking.identity.web;

import org.springframework.http.HttpStatus;

public class ConflictException extends ApiException {
  public ConflictException(String message) {
    super(HttpStatus.CONFLICT, message);
  }
}


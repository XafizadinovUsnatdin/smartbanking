package com.smartbanking.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "branches")
public class Branch {
  @Id
  @Column(name = "id", nullable = false)
  private UUID id;

  @Column(name = "name", nullable = false, length = 200)
  private String name;

  @Column(name = "address", length = 400)
  private String address;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected Branch() {}

  public Branch(UUID id, String name, String address, Instant createdAt) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.createdAt = createdAt;
  }

  public UUID getId() { return id; }
  public String getName() { return name; }
  public String getAddress() { return address; }
  public Instant getCreatedAt() { return createdAt; }

  public void setName(String name) { this.name = name; }
  public void setAddress(String address) { this.address = address; }
}


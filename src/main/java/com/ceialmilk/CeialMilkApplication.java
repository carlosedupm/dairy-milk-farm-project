package com.ceialmilk;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;

@SpringBootApplication(exclude = {FlywayAutoConfiguration.class})
public class CeialMilkApplication {

    public static void main(String[] args) {
        SpringApplication.run(CeialMilkApplication.class, args);
    }
}


library(dplyr)

N <- 1E6
years <- 2000:2016

tables <- vector(mode = "list", length(years))

for (year in years) {
  
  rel_year <- year - 2000
  
  age <- sample(15:65, N, replace=TRUE)
  sex <- ifelse(rbinom(N, 1, 0.7 + rel_year*0.01) == 1, 'M', 'F')
  region <- sample(1:100, N, replace=TRUE, prob = runif(100, 0.1, 0.9))
  income <- 1000 + age * 30 + (sex == 'M')*(500 - rel_year*3) + rel_year*10 + rnorm(N)*400
  
#   plot(age, income, col = as.factor(sex))
  
  region <- sprintf("GM%03d", region)
  
  age    <- cut(age, breaks = seq(15, 65, by=10), include.lowest = TRUE, right = FALSE)
  levels(age) <- c("15_25", "25_35", "35_45", "45_55", "55_65")
  age    <- as.character(age)
  
  dat <- data.frame(age, sex, region, income, stringsAsFactors = FALSE)
  
  library(dplyr)
  
  tab0 <- dat %>% group_by(age, sex, region) %>% summarise(
    mean_income = mean(income), n = n())
  tab_region <- dat %>% group_by(age, sex) %>% summarise(
    mean_income = mean(income), n = n())
  tab_age <- dat %>% group_by(sex, region) %>% summarise(
    mean_income = mean(income), n = n())
  tab_sex <- dat %>% group_by(age, region) %>% summarise(
    mean_income = mean(income), n = n())
  tab_age_region <- dat %>% group_by(sex) %>% summarise(
    mean_income = mean(income), n = n())
  tab_sex_region <- dat %>% group_by(age) %>% summarise(
    mean_income = mean(income), n = n())
  tab_age_sex <- dat %>% group_by(region) %>% summarise(
    mean_income = mean(income), n = n())
  tab_all <- dat %>% summarise(
    mean_income = mean(income), n = n())
  
  tab <- rbind_all(list(tab0, tab_region, tab_age, tab_sex, tab_age_region, 
    tab_sex_region, tab_age_sex, tab_all)) %>% mutate(year = year) %>%
    select(year, region, age, sex, n, mean_income)
  
  for (col in 1:4) {
    sel <- is.na(tab[[col]])
    tab[[col]][sel] <- "_total_"
  }
  
  tables[[rel_year+1]] <- tab
}

tables <- rbind_all(tables)

tables$mean_income <- round(tables$mean_income,2)

write.csv(tables, "example_table.csv", row.names=FALSE, na="")

lines <- paste0('  {"year":', tables$year, ',"region":"', tables$region, '","age":"', tables$age,
  '","sex":"', tables$sex, '","n":', tables$n, ',"mean_income":', tables$mean_income, '}', 
  collapse=",\n")
lines <- c("[", lines, "]")

writeLines(lines, "example_table.json")

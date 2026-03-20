using System.ComponentModel.DataAnnotations;

namespace TimeTravelAgency.Application.DataAnnotation;

public class MinimumAgeAttribute : ValidationAttribute
{
    private readonly int _minimumAge;

    public MinimumAgeAttribute(int minimumAge)
    {
        _minimumAge = minimumAge;
        ErrorMessage = $"Customer must be at least {_minimumAge} years old.";
    }

    protected override ValidationResult IsValid(object value, ValidationContext validationContext)
    {
        if (value is not DateTime birthDate)
            return new ValidationResult("Invalid date format.");

        var today = DateTime.UtcNow;
        var age = today.Year - birthDate.Year;
        if (birthDate > today.AddYears(-age)) age--;

        if (age < _minimumAge)
            return new ValidationResult(ErrorMessage);

        return ValidationResult.Success!;
    }
}
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace TimeTravelAgency.Application.DataAnnotation;

public class PhoneNumberAttribute : ValidationAttribute
{
    private static readonly Regex _regexPlus = new(@"^\+");
    private static readonly Regex _regexOnlyDigits = new(@"^\+\d{11,15}$");

    protected override ValidationResult IsValid(object value, ValidationContext validationContext)
    {
        if (value is not string phoneNumber)
            return ValidationResult.Success;

        phoneNumber = phoneNumber.Replace(" ", "");

        var property = validationContext.ObjectType.GetProperty(validationContext.MemberName);
        if (property != null && property.CanWrite)
            property.SetValue(validationContext.ObjectInstance, phoneNumber);

        if (!_regexPlus.IsMatch(phoneNumber))
            return new ValidationResult("Phone number must start with a '+').");
        
        if (!_regexOnlyDigits.IsMatch(phoneNumber))
            return new ValidationResult("Phone number must contain between 11 and 15 digits after the '+'.");

        return ValidationResult.Success;
    }
}
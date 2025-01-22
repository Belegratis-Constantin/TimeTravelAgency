namespace TimeTravelAgency.Application.Model;

public class LicensedAgent : Agent
{
    // Constructors

    public LicensedAgent(string firstname, string lastname, DateTime dateOfBirth, int specialisationTime, int licenseNumber, DateTime licenseExpirationDate, Address address)
        : base(firstname, lastname, dateOfBirth, specialisationTime, address)
    {
        LicenseNumber = licenseNumber;
        LicenseExpirationDate = licenseExpirationDate;
    }
    
#pragma warning disable CS8618
    protected LicensedAgent() { }
#pragma warning disable CS8618
    
    
    // Properties
    
    public int LicenseNumber { get; set; }
    public DateTime LicenseExpirationDate { get; set; }
    
    
    // Public Methods

    public void CancelTrip(Trip trip)
    {
        if (Trips.Contains(trip))
        {
            trip.TripStatus = TripStatus.Cancelled;
        }
    }
    
    public void ProcessParadox(Paradox paradox)
    {
        // If any Paradox of this LicensedAgent is currently InProcess => return;
        if (Trips.SelectMany(trip => trip.Paradoxes).Any(par => par.ParadoxStatus == ParadoxStatus.InProcess))
        {
            return;
        }

        if (Trips.Contains(paradox.Trip))
        {
            paradox.ParadoxStatus = ParadoxStatus.InProcess;
        }
    }

    public void SolveParadox(Paradox paradox)
    {
        if (Trips.Contains(paradox.Trip) && paradox.ParadoxStatus == ParadoxStatus.InProcess)
        {
            paradox.ParadoxStatus = ParadoxStatus.Solved;
        }
    }
}
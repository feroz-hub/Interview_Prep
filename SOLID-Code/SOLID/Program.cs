namespace SOLID
{
    internal class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello, World!");
        }
    }

    //Violating SRP, because the class
    //has extra responsibility

    //public class Employee
    //{
    //    //Own responsibility
    //    public int CalculateSalary()
    //    {
    //        return 100000;
    //    }

    //    //Own responsibility
    //    public string GetDepartment()
    //    {
    //        return "IT";
    //    }

    //    //Extra responsibility
    //    public void Save()
    //    {
    //        //Save employee to the database
    //    }
    //}

    //Following SRP
    public class Employee
    {
        public int CalculateSalary()
        {
            return 100000;
        }
        public string GetDepartment()
        {
            return "IT";
        }
    }

    public class EmployeeRepository
    {
        public void Save(Employee employee)
        {
            //Save employee to the database
        }
    }


}